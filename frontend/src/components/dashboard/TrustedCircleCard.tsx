import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { mockTrustedContacts, type MockTrustedContactItem } from '../../mock/demoData';

export interface TrustedCircleCardProps {
  contacts?: MockTrustedContactItem[];
  className?: string;
}

export const TrustedCircleCard: React.FC<TrustedCircleCardProps> = ({
  contacts = mockTrustedContacts,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <Card
      variant="card"
      className={className}
      icon={<Users className="w-5 h-5 text-emerald-400" />}
      title="Trusted Circle"
      subtitle={`${contacts.length} verified emergency responders`}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/trusted-circle')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Manage Circle
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Your immediate priority circle for rapid emergency check-ins and automated route departure alerts.
        </p>

        {/* Contact Avatars & Names */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                {contact.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {contact.name}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {contact.relationship}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
          <span>Broadcast alerts will dispatch via SMS/WhatsApp in Step 7.</span>
          <button
            type="button"
            onClick={() => navigate('/trusted-circle')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default TrustedCircleCard;
