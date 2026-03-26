import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LikeButton from '../client/src/components/LikeButton';
import api from '../client/src/api/axios';

// Mock axios
vi.mock('../api/axios');

describe('LikeButton', () => {
  const mockPost = { _id: 'post1', upvote_count: 5 };
  const mockUser = { _id: 'user1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with initial likes', () => {
    render(<LikeButton post={mockPost} user={mockUser} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thích/i })).toHaveClass('like-button');
  });

  it('toggles like state and calls API optimally', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'success' } });
    
    render(<LikeButton post={mockPost} user={mockUser} />);
    const button = screen.getByRole('button', { name: /thích/i });
    
    // Click to like
    fireEvent.click(button);
    
    // Check optimistic update
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(button).toHaveClass('liked');
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/forum/votes', {
        user_id: 'user1',
        target_id: 'post1',
        target_type: 'FORUM_POST',
        vote_type: 'UPVOTE'
      });
    });
  });

  it('alerts if user is not logged in instead of throwing errors', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<LikeButton post={mockPost} user={null} />);
    const button = screen.getByRole('button', { name: /thích/i });
    
    fireEvent.click(button);
    
    expect(alertMock).toHaveBeenCalledWith('Vui lòng đăng nhập để thích bài viết!');
    expect(screen.getByText('5')).toBeInTheDocument(); // Count shouldn't change
    expect(api.post).not.toHaveBeenCalled();
    
    alertMock.mockRestore();
  });

  it('reverts like state if API call fails', async () => {
    // Mock the console to suppress the expected error log
    const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error('Network Error'));
    
    render(<LikeButton post={mockPost} user={mockUser} />);
    const button = screen.getByRole('button', { name: /thích/i });
    
    // Initial state is 5, clicking should optimistically make it 6
    fireEvent.click(button);
    expect(screen.getByText('6')).toBeInTheDocument();
    
    // Wait for the rejection to be handled
    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      // After failure, it reverts to 5
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(button).not.toHaveClass('liked');
    });
    
    consoleMock.mockRestore();
  });
});
