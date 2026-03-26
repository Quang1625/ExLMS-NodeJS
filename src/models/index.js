const User = require('./User');
const { ForumTag, ForumPost, ForumComment, ForumVote, ForumSavedPost } = require('./Forum');
const { StudyGroup, GroupFeedPost, GroupFeedComment } = require('./StudyGroup');
const { Course, CourseEnrollment } = require('./Course');
const { Quiz, QuizAttempt } = require('./Quiz');
const { Assignment, AssignmentSubmission } = require('./Assignment');
const Meeting = require('./Meeting');
const CalendarEvent = require('./CalendarEvent');
const Notification = require('./Notification');

module.exports = {
    User,
    ForumTag, ForumPost, ForumComment, ForumVote, ForumSavedPost,
    StudyGroup, GroupFeedPost, GroupFeedComment,
    Course, CourseEnrollment,
    Quiz, QuizAttempt,
    Assignment, AssignmentSubmission,
    Meeting,
    CalendarEvent,
    Notification
};
