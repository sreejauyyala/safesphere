import React from 'react';
import SafetyPulseCardReal, { type SafetyPulseCardProps } from '../safety-pulse/SafetyPulseCard';

export const SafetyPulseCard: React.FC<SafetyPulseCardProps> = (props) => {
  return <SafetyPulseCardReal {...props} />;
};

export default SafetyPulseCard;
export * from '../safety-pulse/SafetyPulseCard';
