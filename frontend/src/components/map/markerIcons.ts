/**
 * Marker Icon Factory for SafeSphere Leaflet Map
 * Creates visually distinct markers for User Location, Safety Reports, and Help Points
 * using SVG icons and clear symbols (never color alone).
 */
import L from 'leaflet';

/**
 * Creates custom pulsing User Location Marker
 */
export const createUserLocationIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'safesphere-user-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; items-center: center; justify-content: center;">
        <div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 24px; height: 24px; border-radius: 9999px; background-color: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 14px rgba(37, 99, 235, 0.8); display: flex; align-items: center; justify-content: center; position: relative; z-index: 10;">
          <div style="width: 7px; height: 7px; border-radius: 9999px; background-color: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

/**
 * Creates distinct Safety Report category marker
 */
export const createSafetyReportIcon = (category: string, severity: string): L.DivIcon => {
  let symbol = '⚠️';
  let bgColor = '#e11d48'; // Rose
  let borderColor = '#fda4af';

  switch (category) {
    case 'poor_lighting':
      symbol = '💡';
      bgColor = '#d97706'; // Amber
      borderColor = '#fde68a';
      break;
    case 'road_damage':
      symbol = '🛣️';
      bgColor = '#ea580c'; // Orange
      borderColor = '#fed7aa';
      break;
    case 'road_obstruction':
      symbol = '🚧';
      bgColor = '#ca8a04'; // Yellow-amber
      borderColor = '#fef08a';
      break;
    case 'isolated_area':
      symbol = '👥';
      bgColor = '#7c3aed'; // Purple
      borderColor = '#ddd6fe';
      break;
    case 'transport_issue':
      symbol = '🚌';
      bgColor = '#0284c7'; // Sky
      borderColor = '#bae6fd';
      break;
    default:
      symbol = '⚠️';
      bgColor = '#e11d48';
      borderColor = '#fecdd3';
      break;
  }

  const isCritical = severity === 'critical';

  return L.divIcon({
    className: 'safesphere-report-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background-color: ${bgColor};
        border: 2px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) ${isCritical ? ', 0 0 12px ' + bgColor : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transform: rotate(-3deg);
        cursor: pointer;
      ">
        <span>${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

/**
 * Creates distinct Help Point marker
 */
export const createHelpPointIcon = (pointType: string): L.DivIcon => {
  let symbol = '🛡️';
  let bgColor = '#059669'; // Emerald

  switch (pointType) {
    case 'police_station':
      symbol = '👮';
      bgColor = '#1d4ed8'; // Blue
      break;
    case 'hospital':
      symbol = '🏥';
      bgColor = '#dc2626'; // Red
      break;
    case 'security_desk':
    case 'campus_security':
      symbol = '🛡️';
      bgColor = '#0891b2'; // Cyan
      break;
    default:
      symbol = '📍';
      bgColor = '#059669'; // Emerald
      break;
  }

  return L.divIcon({
    className: 'safesphere-help-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background-color: ${bgColor};
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
      ">
        <span>${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

/**
 * Creates search result temporary marker
 */
export const createSearchMarkerIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'safesphere-search-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background-color: #8b5cf6;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 16px #8b5cf6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">
        <span>🎯</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

/**
 * Creates journey destination / start marker with high-contrast label pin
 */
export const createJourneyEndpointIcon = (isDestination: boolean): L.DivIcon => {
  const bg = isDestination ? '#16A34A' : '#2563EB';
  const label = isDestination ? 'DESTINATION' : 'START';
  const emoji = isDestination ? '🏁' : '🚩';
  const glow = isDestination ? 'rgba(22, 163, 74, 0.7)' : 'rgba(37, 99, 235, 0.7)';

  return L.divIcon({
    className: 'safesphere-journey-endpoint',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 9999px;
          background: ${bg};
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px ${glow}, 0 2px 6px rgba(0,0,0,0.4);
          white-space: nowrap;
        ">
          <span style="font-size: 12px;">${emoji}</span>
          <span>${label}</span>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid ${bg};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 32],
    popupAnchor: [0, -34],
  });
};
