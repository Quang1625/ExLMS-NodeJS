# Hướng dẫn định dạng File Word (.docx) để tạo đề thi

Để hệ thống trích xuất đề thi đạt độ chính xác cao nhất (trên 95%), vui lòng soạn thảo File Word (.docx) theo cấu trúc chuẩn dưới đây.

---

## 1. Thông tin chung của đề thi (Phần đầu file)
Đặt thông tin chung ở các dòng đầu tiên của tài liệu:
* **Môn học:** [Tên môn học/Học phần]
* **Lớp học:** [Tên lớp học hoặc Mã nhóm học]
* **Thời gian làm bài:** [Số phút] phút
* **Mô tả:** [Mô tả ngắn gọn về đề thi, chương trình học, hoặc hướng dẫn chung]

*Ví dụ:*
> **Môn học:** Lập trình Web với NodeJS  
> **Lớp học:** K65-CNTT1  
> **Thời gian làm bài:** 60 phút  
> **Mô tả:** Đề thi cuối kỳ lý thuyết và thực hành NodeJS căn bản.

---

## 2. Định dạng câu hỏi
Hỗ trợ 3 loại câu hỏi: **Trắc nghiệm 1 đáp án**, **Trắc nghiệm nhiều đáp án**, và **Tự luận**. Hãy sử dụng định dạng rõ ràng cho từng câu.

### Loại 1: Trắc nghiệm một đáp án đúng (SINGLE_CHOICE)
* Bắt đầu bằng `Câu X:` hoặc `Câu X.` (với X là số thứ tự).
* Có thể thêm điểm số bằng cách mở rộng `[X điểm]`.
* Các đáp án lựa chọn bắt đầu bằng chữ cái `A.`, `B.`, `C.`, `D.`.
* Chỉ định đáp án đúng bằng dòng `Đáp án đúng: [Chữ cái]`.
* (Tùy chọn) Thêm giải thích bằng dòng `Giải thích: [Nội dung giải thích]`.

*Ví dụ:*
> **Câu 1 [10 điểm]:** Framework nào sau đây được xây dựng trên nền tảng NodeJS?  
> A. ExpressJS  
> B. Django  
> C. Laravel  
> D. Ruby on Rails  
> **Đáp án đúng:** A  
> **Giải thích:** ExpressJS là framework NodeJS phổ biến nhất để xây dựng web và API.

---

### Loại 2: Trắc nghiệm nhiều đáp án đúng (MULTIPLE_CHOICE)
* Cấu trúc tương tự trắc nghiệm 1 đáp án.
* Ở dòng đáp án đúng, liệt kê các chữ cái ngăn cách bởi dấu phẩy hoặc dấu chấm phẩy.

*Ví dụ:*
> **Câu 2 [10 điểm]:** Những cơ sở dữ liệu nào dưới đây thuộc nhóm NoSQL?  
> A. MongoDB  
> B. MySQL  
> C. PostgreSQL  
> D. Redis  
> **Đáp án đúng:** A, D  
> **Giải thích:** MongoDB là Document DB, Redis là Key-Value DB. MySQL và PostgreSQL là RDBMS.

---

### Loại 3: Câu hỏi tự luận / Trả lời ngắn (SHORT_ANSWER)
* Bắt đầu bằng tiêu đề câu hỏi.
* Không liệt kê các lựa chọn A, B, C, D.
* Ở cuối ghi `Đáp án đúng: Tự luận` hoặc ghi gợi ý chấm điểm.

*Ví dụ:*
> **Câu 3 [15 điểm]:** Trình bày khái niệm Middleware trong ExpressJS và cho ví dụ minh họa.  
> **Đáp án đúng:** Tự luận

---

## 3. Các lưu ý quan trọng về bảo mật và định dạng
1. **Kích thước file tối đa:** 10MB.
2. **Hình ảnh & Công thức:** Mammoth sẽ trích xuất văn bản thuần. Nếu câu hỏi có hình ảnh, bạn có thể chỉnh sửa đính kèm URL hình ảnh trực tiếp sau khi tải lên hệ thống.
3. **Mã độc & Script:** File Word sẽ được quét bảo mật trước khi xử lý. Nghiêm cấm chèn các đoạn mã chạy script (`<script>`) hoặc mã độc trong file Word.
