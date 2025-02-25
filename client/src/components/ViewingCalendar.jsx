import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

export default function ViewingCalendar({ acceptedViewings }) {
  const [selectedViewing, setSelectedViewing] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group viewings by date for easier lookup
  const viewingsByDate = acceptedViewings.reduce((acc, viewing) => {
    const date = new Date(viewing.date).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(viewing);
    return acc;
  }, {});

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')} - Accepted Viewings
        </h2>
        
        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dateString = day.toDateString();
          const hasViewings = viewingsByDate[dateString]?.length > 0;
          
          return (
            <div
              key={day.toString()}
              className={`
                relative p-2 min-h-[100px] border rounded-lg
                ${hasViewings ? 'bg-green-50 border-green-200' : 'border-gray-100'}
                hover:shadow-md transition-shadow duration-200
              `}
            >
              <span className={`
                text-sm ${isSameDay(day, new Date()) ? 'font-bold text-blue-600' : 'text-gray-700'}
              `}>
                {format(day, 'd')}
              </span>
              
              {hasViewings && (
                <div className="mt-1 space-y-1">
                  {viewingsByDate[dateString].map((viewing, idx) => (
                    <div
                      key={idx}
                      className="relative group"
                      onMouseEnter={() => setSelectedViewing(viewing)}
                      onMouseLeave={() => setSelectedViewing(null)}
                    >
                      <div className="text-xs bg-green-100 text-green-800 rounded px-1.5 py-1 cursor-pointer hover:bg-green-200">
                        <div className="font-medium truncate">
                          {viewing.viewer?.username || 'Anonymous'}
                        </div>
                        <div className="text-green-700">
                          {viewing.startTime} - {viewing.endTime}
                        </div>
                      </div>

                      {/* Detailed popup on hover */}
                      {selectedViewing === viewing && (
                        <div className="absolute z-10 left-full top-0 ml-2 w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-200">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 mb-1">
                              {viewing.listing?.name || 'Property Viewing'}
                            </p>
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Scheduler:</span> {viewing.viewer?.username || 'Anonymous'}
                            </p>
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Email:</span> {viewing.viewer?.email}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Time:</span> {viewing.startTime} - {viewing.endTime}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
