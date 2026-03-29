import React, { useState } from 'react';

const MediaRenderer = ({ url, type, style = {} }) => {
  const [hasError, setHasError] = useState(false);

  if (!url) return null;

  // Normalize URL: Ensure relative URLs start with / and handle potential port mismatches
  let resolvedUrl = url;
  if (typeof url === 'string') {
    if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')) {
      resolvedUrl = '/' + url;
    }
    // If URL points to backend port 3001 directly, redirect it to use the frontend proxy (5173)
    if (url.includes('localhost:3001')) {
      resolvedUrl = url.replace('localhost:3001', window.location.host);
    }
  }

  const placeholderSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%232d2d3d'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23888899'%3EKh%C3%B4ng th%E1%BB%83 t%E1%BA%A3i %E1%BA%A3nh%3C/text%3E%3C/svg%3E`;

  // Detect YouTube
  const isYouTube = typeof resolvedUrl === 'string' && (resolvedUrl.includes('youtube.com/watch') || resolvedUrl.includes('youtu.be/') || resolvedUrl.includes('youtube.com/embed/'));
  if (isYouTube) {
    let videoId = '';
    if (resolvedUrl.includes('v=')) videoId = resolvedUrl.split('v=')[1].split('&')[0];
    else if (resolvedUrl.includes('youtu.be/')) videoId = resolvedUrl.split('youtu.be/')[1].split('?')[0];
    else if (resolvedUrl.includes('embed/')) videoId = resolvedUrl.split('embed/')[1].split('?')[0];

    return (
      <div className="media-renderer iframe-wrapper" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '24px', ...style }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="YouTube Video"
        />
      </div>
    );
  }

  // Detect TikTok
  const isTikTok = typeof resolvedUrl === 'string' && resolvedUrl.includes('tiktok.com');
  if (isTikTok) {
    const videoIdMatch = resolvedUrl.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (videoId) {
      return (
        <div className="media-renderer tiktok-wrapper" style={{ borderRadius: '24px', overflow: 'hidden', background: '#000', margin: '0 auto', maxWidth: '325px', ...style }}>
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            style={{ width: '100%', height: '580px', border: 0 }}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="TikTok Video"
          />
        </div>
      );
    }
  }

  // Handle direct Video file (.mp4, .webm, etc)
  if (type === 'VIDEO' || (typeof resolvedUrl === 'string' && resolvedUrl.match(/\.(mp4|webm|ogg)$/i))) {
    return (
      <div className="media-renderer video-wrapper" style={{ borderRadius: '24px', overflow: 'hidden', background: '#000', ...style }}>
        <video src={resolvedUrl} controls autoPlay style={{ width: '100%', maxHeight: '450px', display: 'block' }} />
      </div>
    );
  }

  // Default to Image
  return (
    <div className="media-renderer image-wrapper" style={{ borderRadius: '24px', overflow: 'hidden', textAlign: 'center', ...style }}>
      <img 
        src={hasError ? placeholderSvg : resolvedUrl} 
        alt="Media content" 
        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} 
        onError={() => setHasError(true)}
      />
      {hasError && (
        <div style={{ padding: '10px', fontSize: '0.8rem' }}>
          <p style={{ color: 'var(--text-3)', margin: '5px 0' }}>URL: {resolvedUrl.substring(0, 50)}...</p>
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
             Xem URL gốc
          </a>
        </div>
      )}
    </div>
  );
};


export default MediaRenderer;
