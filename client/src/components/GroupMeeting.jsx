import { JitsiMeeting } from '@jitsi/react-sdk';

export default function GroupMeeting({ group, user }) {
  // Creating a more unique URL safe room name
  const roomName = `ExLMS_StudyGroup_${group?._id || 'Room'}`;
  
  return (
    <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', background: '#111', height: '650px', border: '1px solid var(--border)' }}>
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          prejoinPageEnabled: true,
          disableModeratorIndicator: true,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        }}
        userInfo={{
          displayName: user?.full_name || 'Thành viên',
          email: user?.email || '',
        }}
        onApiReady={(externalApi) => {
          // Can add listener to externalApi if needing events
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
          iframeRef.style.border = 'none';
        }}
      />
    </div>
  );
}
