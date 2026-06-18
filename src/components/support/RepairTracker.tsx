import { CheckCircle2, Circle, Clock, Wrench, Package, Truck } from "lucide-react";

export type RepairStatus = 'Received' | 'Diagnosing' | 'Waiting for Parts' | 'Repaired' | 'Delivered';

interface RepairTrackerProps {
  status: RepairStatus;
}

export function RepairTracker({ status }: RepairTrackerProps) {
  const steps = [
    { id: 'Received', title: 'Received', icon: Package },
    { id: 'Diagnosing', title: 'Diagnosing', icon: Clock },
    { id: 'Waiting for Parts', title: 'Waiting for Parts', icon: Wrench },
    { id: 'Repaired', title: 'Repaired', icon: CheckCircle2 },
    { id: 'Delivered', title: 'Delivered', icon: Truck },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status);
  // If status is 'Waiting for Parts', it's technically past diagnosing but stalled. We treat it as step 2 index.

  return (
    <div className="w-full py-8">
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center">
        {/* Progress Line */}
        <div className="absolute top-5 md:top-1/2 left-4 md:left-0 h-full md:h-1 w-1 md:w-full -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 bg-gray-200 dark:bg-gray-800 -z-10">
          <div 
            className="bg-blue-600 transition-all duration-500 ease-in-out" 
            style={{ 
              width: window.innerWidth > 768 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : '100%',
              height: window.innerWidth <= 768 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : '100%'
            }}
          />
        </div>

        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex md:flex-col items-center gap-4 md:gap-2 mb-8 md:mb-0 z-10 w-full md:w-auto">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300 ${
                  isCompleted 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'bg-white dark:bg-[#111118] border-gray-300 dark:border-gray-700 text-gray-400'
                } ${isCurrent && 'ring-4 ring-blue-600/20'}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="md:text-center md:absolute md:top-14 md:w-32 md:-left-11">
                <p className={`font-semibold text-sm ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
