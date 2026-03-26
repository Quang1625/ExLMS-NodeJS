import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GroupMeeting from '../client/src/components/GroupMeeting';

// Mock the JitsiMeeting component
vi.mock('@jitsi/react-sdk', () => ({
  JitsiMeeting: vi.fn(({ roomName, userInfo }) => (
    <div data-testid="jitsi-mock">
      Meeting Room: {roomName}
      <br />
      User: {userInfo?.displayName}
    </div>
  )),
}));

describe('GroupMeeting', () => {
  it('renders the JitsiMeeting component with correct room name and user info', () => {
    const mockGroup = { _id: '12345' };
    const mockUser = { full_name: 'Test User', email: 'test@example.com' };

    render(<GroupMeeting group={mockGroup} user={mockUser} />);

    const mockJitsi = screen.getByTestId('jitsi-mock');
    expect(mockJitsi).toBeInTheDocument();
    expect(mockJitsi).toHaveTextContent('Meeting Room: ExLMS_StudyGroup_12345');
    expect(mockJitsi).toHaveTextContent('User: Test User');
  });

  it('uses default values when group and user are not fully provided', () => {
    render(<GroupMeeting group={{}} user={null} />);

    const mockJitsi = screen.getByTestId('jitsi-mock');
    expect(mockJitsi).toBeInTheDocument();
    expect(mockJitsi).toHaveTextContent('Meeting Room: ExLMS_StudyGroup_Room');
    expect(mockJitsi).toHaveTextContent('User: Thành viên');
  });
});
