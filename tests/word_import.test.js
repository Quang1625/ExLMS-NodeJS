const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../Server/app');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const archiver = require('archiver');

// Function to generate a mock in-memory .docx file structure
function createMockDocx(text) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip');
    const buffers = [];
    
    archive.on('data', data => buffers.push(data));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', err => reject(err));
    
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:r>
            <w:t>${escapedText}</w:t>
          </w:r>
        </w:p>
      </w:body>
    </w:document>`;
    
    archive.append(xmlContent, { name: 'word/document.xml' });
    archive.finalize();
  });
}

describe('Word Document Exam Creation API', () => {
  let instructorToken, studentToken;
  let instructorUser, studentUser;
  let originalFetch;

  beforeAll(async () => {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exlms_test');
    
    instructorUser = await User.create({
      email: 'instructor_word@test.com',
      full_name: 'Instructor Word',
      role: 'INSTRUCTOR',
      status: 'ACTIVE'
    });
    
    studentUser = await User.create({
      email: 'student_word@test.com',
      full_name: 'Student Word',
      role: 'STUDENT',
      status: 'ACTIVE'
    });

    instructorToken = jwt.sign({ userId: instructorUser._id }, process.env.JWT_ACCESS_SECRET || 'access_secret_dev');
    studentToken = jwt.sign({ userId: studentUser._id }, process.env.JWT_ACCESS_SECRET || 'access_secret_dev');

    // Mock Gemini API call
    originalFetch = global.fetch;
    const mockGeminiResponse = {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              title: "Đề thi môn Lập trình Web - K65",
              description: "Đề thi trắc nghiệm và tự luận môn Lập trình Web",
              time_limit_sec: 3600,
              questions: [
                {
                  content: "Thành phần nào dùng để định dạng trang web?",
                  question_type: "SINGLE_CHOICE",
                  points: 10,
                  explanation: "CSS dùng để định dạng.",
                  answers: [
                    { content: "HTML", is_correct: false },
                    { content: "CSS", is_correct: true },
                    { content: "JS", is_correct: false }
                  ]
                }
              ]
            })
          }]
        }
      }]
    };

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGeminiResponse)
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['instructor_word@test.com', 'student_word@test.com'] } });
    await mongoose.connection.close();
    global.fetch = originalFetch;
  });

  it('should reject requests without authentication token', async () => {
    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .attach('file', Buffer.from('hello'), 'test.docx');

    expect(res.statusCode).toEqual(401);
  });

  it('should reject requests from STUDENTS', async () => {
    const docxBuffer = await createMockDocx('Some content');
    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', docxBuffer, 'test.docx');

    expect(res.statusCode).toEqual(403);
  });

  it('should reject file upload without any file', async () => {
    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/vui lòng tải lên/i);
  });

  it('should reject file with non-docx extension', async () => {
    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .set('Authorization', `Bearer ${instructorToken}`)
      .attach('file', Buffer.from('hello text content'), 'test.txt');

    expect(res.statusCode).toEqual(500); // Multer filter throws error which becomes 500 in global handler
  });

  it('should reject content with malicious scripts (security scanner)', async () => {
    const maliciousText = "Môn học: Web\nThời gian: 60 phút\nCâu hỏi: <script>alert('hack')</script>";
    const docxBuffer = await createMockDocx(maliciousText);

    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .set('Authorization', `Bearer ${instructorToken}`)
      .attach('file', docxBuffer, 'test.docx')
      .field('apiKey', 'MOCK_KEY');

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/phát hiện nội dung không an toàn/i);
  });

  it('should successfully parse a valid docx file and return structured quiz metadata and questions', async () => {
    const testDocxText = "Môn học: Lập trình Web\nThời gian: 60 phút\nLớp: K65\nCâu 1: Thành phần nào định dạng?";
    const docxBuffer = await createMockDocx(testDocxText);

    const res = await request(app)
      .post('/api/quizzes/generate-from-file')
      .set('Authorization', `Bearer ${instructorToken}`)
      .attach('file', docxBuffer, 'test.docx')
      .field('apiKey', 'MOCK_KEY');

    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toEqual("Đề thi môn Lập trình Web - K65");
    expect(res.body.time_limit_sec).toEqual(3600);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].content).toEqual("Thành phần nào dùng để định dạng trang web?");
    expect(res.body.questions[0].answers[1].is_correct).toBe(true);
  });
});
