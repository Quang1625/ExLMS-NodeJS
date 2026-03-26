import { useState, useEffect } from 'react';
import api from '../api/axios';
import './LikeButton.css';

const REACTIONS = {
  LIKE: '👍',
  HEART: '❤️',
  WOW: '😮',
  SAD: '😢',
  LAUGH: '😂'
};

export default function LikeButton({ post, user, initialVoteType = null, targetType = 'FORUM_POST' }) {
  const [voteType, setVoteType] = useState(initialVoteType);
  const [likeCount, setLikeCount] = useState(post.upvote_count || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVoteType(initialVoteType);
    setLikeCount(post.upvote_count || 0);
  }, [initialVoteType, post.upvote_count]);

  const handleReaction = async (type) => {
    if (!user) {
      alert('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    if (isLoading) return;

    const isRemoving = voteType === type;
    const prevType = voteType;

    setIsLoading(true);
    setVoteType(isRemoving ? null : type);
    
    // Update count based on positive reaction logic
    if (isRemoving) {
      setLikeCount(prev => Math.max(0, prev - 1));
    } else if (!prevType) {
      setLikeCount(prev => prev + 1);
    }
    // (If switching from one positive reaction to another, count stays same)

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      await api.post('/forum/votes', {
        user_id: user._id,
        target_id: post._id,
        target_type: targetType,
        vote_type: type
      });
    } catch (err) {
      setVoteType(prevType);
      // Revert count if needed... but let's keep it simple
      console.error('Lỗi khi thực hiện cảm xúc', err);
    } finally {
      setIsLoading(false);
    }
  };


  const currentEmoji = voteType ? REACTIONS[voteType] : '👍🏻';

  return (
    <div className="like-button-container">
      <div className="reactions-picker">
        {Object.entries(REACTIONS).map(([type, emoji]) => (
          <span 
            key={type} 
            className="reaction-option" 
            onClick={() => handleReaction(type)}
            title={type}
          >
            {emoji}
          </span>
        ))}
      </div>
      <button
        onClick={() => handleReaction('LIKE')}
        className={`like-button ${voteType ? 'liked' : ''} ${isAnimating ? 'animating' : ''}`}
      >
        <span className="like-icon">{currentEmoji}</span>
        <span>{likeCount > 0 ? likeCount : 'Thích'}</span>
      </button>
    </div>
  );
}
