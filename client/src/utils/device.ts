export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  name: string;
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let os = 'Outro';
  let browser = 'Outro';
  let name = 'Computador';

  // Detect Device Type
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    type = 'mobile';
  }

  // Detect OS
  if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/Chrome/i.test(ua) && !/Chromium|Edg|OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|Edg|OPR/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  }

  // Set descriptive name
  if (type === 'mobile') {
    name = /iPhone/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Celular Android' : 'Celular';
  } else if (type === 'tablet') {
    name = /iPad/i.test(ua) ? 'iPad' : 'Tablet';
  } else {
    name = `Computador (${os})`;
  }

  return { type, os, browser, name };
}
