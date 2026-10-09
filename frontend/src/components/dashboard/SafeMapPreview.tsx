import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useLocation } from '../../contexts/LocationContext';
import mapService from '../../services/mapService';
import type { MapSafetyReport, MapHelpPoint } from '../../types';
import SafeSphereMap from '../map/SafeSphereMap';

export interface SafeMapPreviewProps {
  className?: string;
}

export const SafeMapPreview: React.FC<SafeMapPreviewProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { currentLocation } = useLocation();
  const [reports, setReports] = useState<MapSafetyReport[]>([]);
  const [helpPoints, setHelpPoints] = useState<MapHelpPoint[]>([]);

  useEffect(() => {
    let isMounted = true;
    mapService
      .getConsolidatedMapData(currentLocation?.latitude, currentLocation?.longitude, 10000)
      .then((data) => {
        if (isMounted) {
          // Take top relevant reports and help points for preview
          setReports((data.reports || []).slice(0, 4));
          setHelpPoints((data.help_points || []).slice(0, 3));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentLocation]);

  const handleOpen = () => {
    navigate('/map');
  };

  return (
    <Card
      variant="card"
      className={`relative overflow-hidden ${className}`}
      icon={<Map className="w-5 h-5 text-blue-400" />}
      title="Safety Map Preview"
      subtitle="Live intelligence layer & 24/7 havens"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Open Safety Map
        </Button>
      }
    >
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-56 w-full">
        <SafeSphereMap
          userLocation={currentLocation}
          reports={reports}
          helpPoints={helpPoints}
          showHotspots={false}
          className="h-full w-full min-h-[220px]"
        />

        {/* Floating Open Full Map Badge */}
        <button
          type="button"
          onClick={handleOpen}
          className="absolute bottom-3 right-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
        >
          <span>Open Full Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
};

export default SafeMapPreview;
