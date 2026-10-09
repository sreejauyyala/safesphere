import type { MapSafetyReport, MapHelpPoint, MapHotspot } from '../../types';

export const renderReportPopupHtml = (report: MapSafetyReport): string => {
  const getCatBadge = (cat: string) => {
    switch (cat) {
      case 'poor_lighting':
        return { label: 'Poor Lighting', symbol: '💡', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' };
      case 'road_damage':
        return { label: 'Road Damage', symbol: '🛣️', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)' };
      case 'road_obstruction':
        return { label: 'Road Obstruction', symbol: '🚧', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.15)' };
      case 'isolated_area':
        return { label: 'Isolated Area', symbol: '👥', color: '#9333ea', bg: 'rgba(147, 51, 234, 0.15)' };
      case 'transport_issue':
        return { label: 'Transport Issue', symbol: '🚌', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)' };
      default:
        return { label: 'General Hazard', symbol: '⚠️', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)' };
    }
  };

  const badge = getCatBadge(report.category);

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 4px; min-width: 220px; max-width: 260px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: ${badge.color}; background: ${badge.bg}; padding: 2px 8px; border-radius: 6px; border: 1px solid ${badge.color}40;">
          ${badge.symbol} ${badge.label}
        </span>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #cbd5e1; background: #334155; padding: 2px 6px; border-radius: 9999px;">
          ${report.severity}
        </span>
      </div>
      <h4 style="font-size: 12px; font-weight: 700; margin: 0 0 4px 0; color: #ffffff; line-height: 1.3;">
        ${report.title}
      </h4>
      ${report.description ? `<p style="font-size: 11px; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">${report.description}</p>` : ''}
      <div style="padding-top: 6px; border-top: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>Status: <strong style="color: #38bdf8;">${report.status || 'OPEN'}</strong></span>
        <a href="/report/${report.id}" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">View Details &rarr;</a>
      </div>
    </div>
  `;
};


export const renderHelpPointPopupHtml = (hp: MapHelpPoint): string => {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'police_station':
        return { label: 'Police Station', symbol: '👮', color: '#3b82f6' };
      case 'hospital':
        return { label: 'Hospital / ER', symbol: '🏥', color: '#ef4444' };
      case 'security_desk':
        return { label: 'Security Desk', symbol: '🛡️', color: '#06b6d4' };
      case 'campus_security':
        return { label: 'Campus Security', symbol: '🏫', color: '#6366f1' };
      default:
        return { label: 'Safe Haven', symbol: '📍', color: '#10b981' };
    }
  };

  const badge = getTypeBadge(hp.type);

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 4px; min-width: 220px; max-width: 260px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: ${badge.color}; background: ${badge.color}20; padding: 2px 8px; border-radius: 6px; border: 1px solid ${badge.color}40;">
          ${badge.symbol} ${badge.label}
        </span>
        <span style="font-size: 10px; font-weight: 700; color: #34d399;">
          Verified ✓
        </span>
      </div>
      <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 4px 0; color: #ffffff;">
        ${hp.name}
      </h4>
      <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 6px 0;">📍 ${hp.address}</p>
      ${hp.phone ? `
        <div style="padding-top: 6px; border-top: 1px solid #334155; font-size: 11px;">
          <span style="color: #94a3b8;">Emergency: </span>
          <a href="tel:${hp.phone}" style="color: #60a5fa; font-weight: bold; text-decoration: none;">📞 ${hp.phone}</a>
        </div>
      ` : ''}
    </div>
  `;
};

export const renderHotspotPopupHtml = (hs: MapHotspot): string => {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 4px; min-width: 220px; max-width: 260px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.4);">
          🟠 ${hs.level.toUpperCase()} CONCERN
        </span>
        <span style="font-size: 10px; color: #94a3b8;">${Math.round(hs.radius)}m Radius</span>
      </div>
      <h4 style="font-size: 12px; font-weight: 700; margin: 0 0 4px 0; color: #ffffff;">
        ${hs.label}
      </h4>
      ${hs.description ? `<p style="font-size: 11px; color: #cbd5e1; margin: 0 0 6px 0;">${hs.description}</p>` : ''}
      <div style="padding-top: 6px; border-top: 1px solid #334155; font-size: 10px; color: #94a3b8;">
        Source: ${hs.source}
      </div>
    </div>
  `;
};
