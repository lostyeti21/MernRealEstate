import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  format, 
  addDays, 
  setHours, 
  setMinutes, 
  parse, 
  getMinutes, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';
import Loader from '../components/Loader';
import RejectionReasonPopup from '../components/RejectionReasonPopup';
import AcceptMorePopup from '../components/AcceptMorePopup';
import ViewingCalendar from '../components/ViewingCalendar';
import { motion } from 'framer-motion';
import MessagingWidget from '../components/MessagingWidget';

const TimeSlotDetailPopup = ({ timeSlot, onClose, onSelect }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // Generate available dates (next 6 weeks)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // Loop through the next 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = addDays(today, i);
      const dayName = format(date, 'EEEE').toLowerCase();
      
      if (dayName === timeSlot.day) {
        dates.push(date);
      }
    }
    return dates;
  };

  // Generate available times within the time slot
  const getAvailableTimes = () => {
    const times = [];
    const startTime = parse(timeSlot.start, 'HH:mm', new Date());
    const endTime = parse(timeSlot.end, 'HH:mm', new Date());
    
    let currentTime = startTime;
    while (currentTime <= endTime) {
      times.push(format(currentTime, 'HH:mm'));
      currentTime = setMinutes(currentTime, getMinutes(currentTime) + 30);
    }
    return times;
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }
    
    const dateTime = setMinutes(
      setHours(
        new Date(selectedDate),
        parseInt(selectedTime.split(':')[0]),
      ),
      parseInt(selectedTime.split(':')[1])
    );
    
    onSelect({
      ...timeSlot,
      selectedDate: dateTime
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Select Date & Time for {timeSlot.day.charAt(0).toUpperCase() + timeSlot.day.slice(1)}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Dates
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a date</option>
              {getAvailableDates().map((date) => (
                <option key={date.toISOString()} value={date.toISOString()}>
                  {format(date, 'EEEE, MMMM d, yyyy')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Times
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a time</option>
              {getAvailableTimes().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime}
            className={`
              w-full py-2 rounded-md transition-colors
              ${(!selectedDate || !selectedTime)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
          >
            {selectedDate && selectedTime ? (
              <>
                Confirm for {format(new Date(selectedDate), 'MMM d')} at {selectedTime}
                <span className="block text-sm opacity-90">
                  {format(new Date(selectedDate), 'EEEE')}
                </span>
              </>
            ) : (
              'Select Date and Time'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ notifications }) => {
  console.log('Notifications passed to CalendarView:', notifications);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  // Get all viewing times from notifications
  const getViewingsForDate = (date) => {
    return notifications.filter(notification => {
      return notification.selectedTimes?.some(time => 
        time.selectedDate && isSameDay(new Date(time.selectedDate), date)
      );
    });
  };

  // Group viewings by time for a specific date
  const getViewingsByTime = (date, viewings) => {
    const timeSlots = {};
    viewings.forEach(viewing => {
      viewing.selectedTimes
        .filter(time => time.selectedDate && isSameDay(new Date(time.selectedDate), date))
        .forEach(time => {
          const timeKey = format(new Date(time.selectedDate), 'HH:mm');
          if (!timeSlots[timeKey]) {
            timeSlots[timeKey] = [];
          }
          timeSlots[timeKey].push({
            username: viewing.from?.username,
            id: viewing._id
          });
        });
    });
    return Object.entries(timeSlots).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentMonth(date => subMonths(date, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          ←
        </button>
        <h3 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(date => addMonths(date, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2 border-b">
            {day.slice(0, 3)}
          </div>
        ))}
        
        {getDaysInMonth().map((date, i) => {
          const viewings = getViewingsForDate(date);
          const viewingsByTime = getViewingsByTime(date, viewings);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          
          return (
            <div
              key={i}
              className={`
                min-h-[120px] p-2 border rounded-lg relative
                ${!isCurrentMonth ? 'bg-gray-100' : 
                  isSameDay(date, new Date()) ? 'bg-blue-50' : 'bg-white'}
                ${!isCurrentMonth ? 'opacity-50' : ''}
              `}
            >
              <div className="text-right text-sm font-medium mb-1">
                <span className={
                  isSameDay(date, new Date()) ? 'bg-blue-500 text-white' : ''
                }>
                  {format(date, 'd')}
                </span>
              </div>
              
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {viewingsByTime.map(([time, slots], idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-gray-700">{time}</div>
                    {slots.map((slot, slotIdx) => (
                      <div 
                        key={slotIdx}
                        className="bg-green-100 text-green-800 p-1 rounded mt-0.5 truncate"
                        title={`Viewing with ${slot.username}`}
                      >
                        {slot.username}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {viewings.length > 2 && (
                <div className="absolute bottom-1 right-1 text-xs text-gray-500">
                  +{viewings.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ViewingRequestPopup = ({ notification, onClose, onAccept, onReject }) => {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [timeSlotDetailPopup, setTimeSlotDetailPopup] = useState({
    show: false,
    timeSlot: null
  });
  
  const availableTimeSlots = notification.data?.timeSlots || [];

  const handleTimeSlotSelect = (timeSlot) => {
    setTimeSlotDetailPopup({
      show: true,
      timeSlot
    });
  };

  const handleTimeSlotDetailSelect = (detailedTimeSlot) => {
    setSelectedTimeSlots(prev => {
      // Remove any existing slot for the same day
      const filteredSlots = prev.filter(slot => slot.day !== detailedTimeSlot.day);
      return [...filteredSlots, detailedTimeSlot];
    });
    setTimeSlotDetailPopup({ show: false, timeSlot: null });
  };

  const handleAccept = () => {
    if (selectedTimeSlots.length === 0) {
      toast.error('Please select at least one viewing time');
      return;
    }
    onAccept({ ...notification, selectedTimes: selectedTimeSlots });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Viewing Request Details</h2>
        
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={notification.from?.avatar || '/default-avatar.png'} 
              alt="User avatar" 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold">{notification.from?.username}</p>
              <p className="text-sm text-gray-500">ID: {notification.data?.reservation?._id}</p>
            </div>
          </div>
          <p className="text-gray-700 mb-2">
            Status: 
            <span className={
              notification.status === 'pending' ? 'text-yellow-500' : 
              notification.status === 'accepted' ? 'text-green-500' : 
              'text-red-500'
            }>
              {' '}{notification.status}
            </span>
          </p>
          <p className="text-gray-700">{notification.message}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Available Time Slots:</h3>
          <div className="flex flex-wrap gap-2">
            {availableTimeSlots.map((timeSlot, index) => {
              const isSelected = selectedTimeSlots.some(selected => selected.day === timeSlot.day);
              return (
                <div
                  key={index}
                  onClick={() => handleTimeSlotSelect(timeSlot)}
                  className={`
                    px-3 py-1 rounded-full cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'bg-green-800 text-white'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }
                  `}
                >
                  {timeSlot.day.charAt(0).toUpperCase() + timeSlot.day.slice(1)}{' '}
                  {timeSlot.start} - {timeSlot.end}
                </div>
              );
            })}
          </div>
          
          {selectedTimeSlots.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Selected Times:</h4>
              <div className="space-y-2">
                {selectedTimeSlots.map((slot, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {format(slot.selectedDate, 'EEEE, MMMM d, yyyy')} at {format(slot.selectedDate, 'HH:mm')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {(!notification.status || notification.status === 'pending') && (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={selectedTimeSlots.length === 0}
                className={`
                  flex-1 py-3 rounded-md transition-colors flex items-center justify-center gap-2
                  ${selectedTimeSlots.length === 0 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Accept ({selectedTimeSlots.length} times)
              </button>
              <button
                onClick={() => onReject(notification)}
                className="flex-1 bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Reject
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Close
          </button>
        </div>
      </div>

      {timeSlotDetailPopup.show && (
        <TimeSlotDetailPopup
          timeSlot={timeSlotDetailPopup.timeSlot}
          onClose={() => setTimeSlotDetailPopup({ show: false, timeSlot: null })}
          onSelect={handleTimeSlotDetailSelect}
        />
      )}
    </div>
  );
};

import styled from 'styled-components';

const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-17.82922&longitude=31.05222&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto'
        );
        const data = await response.json();
        
        const weatherData = {
          current: {
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weathercode
          },
          daily: data.daily
        };
        
        setWeatherData(weatherData);
      } catch (error) {
        console.error('Error fetching weather data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) return <div>Loading weather...</div>;
  if (!weatherData) return <div>Weather data unavailable</div>;

  const getWeatherCondition = (weatherCode) => {
    const conditions = {
      0: 'Clear',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing Rime Fog',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      56: 'Light Freezing Drizzle',
      57: 'Dense Freezing Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      66: 'Light Freezing Rain',
      67: 'Heavy Freezing Rain',
      71: 'Slight Snow',
      73: 'Moderate Snow',
      75: 'Heavy Snow',
      77: 'Snow Grains',
      80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers',
      82: 'Violent Rain Showers',
      85: 'Slight Snow Showers',
      86: 'Heavy Snow Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Slight Hail',
      99: 'Thunderstorm with Heavy Hail'
    };
    return conditions[weatherCode] || 'Unknown';
  };

  return (
    <StyledWrapper>
      <div className="card">
        <section className="landscape-section">
          <div className="sky" />
          <div className="sun">
            <div className="sun-shine-1" />
            <div className="sun-shine-2" />
          </div>
          <div className="hill-1" />
          <div className="hill-2" />
  
          <div className="hill-3" />
          <div className="hill-4" />
          <div className="tree-1">
            <svg version={1.0} id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" xmlSpace="preserve" fill="#47567F">
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path fill="#47567F" d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z" />
              </g>
            </svg>
          </div>
          <div className="tree-2">
            <svg version={1.0} id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" xmlSpace="preserve" fill="#47567F">
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path fill="#47567F" d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z" />
              </g>
            </svg>
          </div>
          <div className="tree-3">
            <svg version={1.0} id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="64px" height="64px" viewBox="0 0 64 64" xmlSpace="preserve" fill="#4A4973" stroke="#4A4973">
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path fill="#4A4973" d="M32,0C18.746,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z" />
              </g>
            </svg>
          </div>
          <div className="filter" />
        </section>
        <section className="content-section">
          <div className="weather-info">
            <div className="left-side">
              <div className="icon">
                <svg stroke="#000000" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <g strokeWidth={0} id="SVGRepo_bgCarrier" />
                  <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier" />
                  <g id="SVGRepo_iconCarrier">
                    <path strokeLinecap="round" strokeWidth="1.5" stroke="#ffffff" d="M22 14.3529C22 17.4717 19.4416 20 16.2857 20H11M14.381 9.02721C14.9767 8.81911 15.6178 8.70588 16.2857 8.70588C16.9404 8.70588 17.5693 8.81468 18.1551 9.01498M7.11616 11.6089C6.8475 11.5567 6.56983 11.5294 6.28571 11.5294C3.91878 11.5294 2 13.4256 2 15.7647C2 18.1038 3.91878 20 6.28571 20H7M7.11616 11.6089C6.88706 10.9978 6.7619 10.3369 6.7619 9.64706C6.7619 6.52827 9.32028 4 12.4762 4C15.4159 4 17.8371 6.19371 18.1551 9.01498M7.11616 11.6089C7.68059 11.7184 8.20528 11.9374 8.66667 12.2426M18.1551 9.01498C18.8381 9.24853 19.4623 9.60648 20 10.0614" />
                  </g>
                </svg>
              </div>
              <p>{getWeatherCondition(weatherData.current.weatherCode)}</p>
            </div>
            <div className="right-side">
              <div className="location">
                <div>
                  <svg version={1.0} id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="64px" height="64px" viewBox="0 0 64 64" xmlSpace="preserve" fill="#ffffff" stroke="#ffffff">
                    <g id="SVGRepo_bgCarrier" strokeWidth={0} />
                    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                    <g id="SVGRepo_iconCarrier">
                      <path fill="#ffffff" d="M32,0C18.746,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z" />
                    </g>
                  </svg>
                  <span>Harare</span>
                </div>
              </div>
              <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="temperature">{weatherData.current.temperature}°C</p>
            </div>
          </div>
          <div className="forecast">
            <div>
              <p>{new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <p>{weatherData.daily.temperature_2m_max[0]}°C</p>
            </div>
            <div className="separator" />
            <div>
              <p>{new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <p>{weatherData.daily.temperature_2m_max[1]}°C</p>
            </div>
            <div className="separator" />
            <div>
              <p>{new Date(Date.now() + 72 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <p>{weatherData.daily.temperature_2m_max[2]}°C</p>
            </div>
          </div>
        </section>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    width: 220px;
    height: 350px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 12px 12px 0px rgba(0, 0, 0, 0.1);
    background-color: white;
  }

  /* Landscape section */
  .landscape-section {
    position: relative;
    width: 100%;
    height: 70%;
    overflow: hidden;
  }

  .landscape-section * {
    position: absolute;
  }

  .sky {
    width: 100%;
    height: 100%;
    background: rgb(247, 225, 87);
    background: linear-gradient(
      0deg,
      rgba(247, 225, 87, 1) 0%,
      rgba(233, 101, 148, 1) 100%
    );
  }

  .sun {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background-color: white;
    bottom: 40%;
    left: 23%;
    filter: drop-shadow(0px 0px 10px white);
  }

  .sun::after {
    position: absolute;
    content: "";
    width: 118%;
    height: 118%;
    border-radius: 50%;
    background-color: white;
    opacity: 0.5;
  }

  .sun::before {
    position: absolute;
    content: "";
    width: 134%;
    height: 134%;
    border-radius: 50%;
    background-color: white;
    opacity: 0.1;
  }

  .ocean {
    overflow: hidden;
    bottom: 0;
    width: 100%;
    height: 28%;
    background: rgb(241, 192, 125);
    background: linear-gradient(
      0deg,
      rgba(241, 192, 125, 1) 0%,
      rgba(247, 218, 150, 1) 100%
    );
  }

  .reflection {
    position: absolute;
    background-color: white;
    opacity: 0.5;
    z-index: 1;
  }

  .reflection:nth-child(1) {
    width: 40px;
    height: 10px;
    clip-path: polygon(0% 0%, 100% 0%, 50% 20%);
    top: 5%;
    left: 32%;
  }

  .reflection:nth-child(2) {
    width: 80px;
    height: 15px;
    clip-path: polygon(0% 0%, 100% 0%, 60% 20%, 40% 20%);
    top: 15%;
    left: 39%;
  }

  .reflection:nth-child(3) {
    width: 60px;
    height: 2px;
    clip-path: polygon(0% 50%, 40% 0%, 60% 0%, 100% 50%, 60% 100%, 40% 100%);
    top: 27%;
    right: 15%;
  }

  .reflection:nth-child(4) {
    width: 70px;
    height: 2px;
    clip-path: polygon(0% 50%, 40% 0%, 60% 0%, 100% 50%, 60% 100%, 40% 100%);
    top: 37%;
    right: 28%;
  }
  .reflection:nth-child(5) {
    width: 70px;
    height: 3px;
    clip-path: polygon(0% 50%, 40% 0%, 60% 0%, 100% 50%, 60% 100%, 40% 100%);
    top: 46%;
    right: 8%;
  }

  .hill-1 {
    right: -25%;
    bottom: 20%;
    width: 150px;
    height: 40px;
    border-radius: 50%;
    background-color: #e6b29d;
  }

  .shadow-hill-1 {
    right: -25%;
    top: -30%;
    width: 150px;
    height: 40px;
    border-radius: 50%;
    background-color: #f1c7a0;
    opacity: 1;
  }

  .hill-2 {
    right: -36%;
    bottom: 10%;
    width: 150px;
    height: 80px;
    border-radius: 50%;
    background-color: #c29182;
  }

  .shadow-hill-2 {
    right: -36%;
    top: -65%;
    width: 150px;
    height: 80px;
    border-radius: 50%;
    background-color: #e5bb96;
    opacity: 1;
  }

  .hill-3 {
    left: -100%;
    bottom: -28%;
    width: 350px;
    height: 150px;
    border-radius: 50%;
    background-color: #b77873;
    z-index: 3;
  }

  .tree-1 {
    bottom: 20%;
    left: 3%;
    width: 50px;
    height: 70px;
    z-index: 3;
  }

  .tree-2 {
    bottom: 14%;
    left: 25%;
    width: 50px;
    height: 70px;
    z-index: 3;
  }

  .hill-4 {
    right: -100%;
    bottom: -40%;
    width: 350px;
    height: 150px;
    border-radius: 50%;
    background-color: #a16773;
    z-index: 3;
  }

  .tree-3 {
    bottom: 10%;
    right: 1%;
    width: 65px;
    height: 80px;
    z-index: 3;
  }

  .filter {
    height: 100%;
    width: 100%;
    background: linear-gradient(
      0deg,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0) 40%
    );
    z-index: 5;
    opacity: 0.2;
  }

  /* Content section */
  .content-section {
    width: 100%;
    height: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .weather-info {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: absolute;
    text-align: center;
    top: 0;
    right: 0%;
    width: 100%;
    padding-top: 15px;
    color: white;
    z-index: 10;
  }

  .weather-info .left-side:not(.icon) {
    width: 20%;
    font-size: 11pt;
    font-weight: 600;
    align-self: baseline;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon svg {
    width: 40px;
  }

  .weather-info .right-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .weather-info .location span {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
  }

  .location {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .location svg {
    width: 14px;
    height: auto;
  }

  .temperature {
    font-size: 20pt;
    font-weight: 700;
    line-height: 30px;
  }

  .forecast {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    height: 100%;
    width: 100%;
    padding: 10px 25px;
  }

  .forecast > div {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: lightslategray;
    font-size: 9pt;
  }

  .separator {
    width: 100%;
    height: 2px;
    background-color: rgb(233, 233, 233);
    border-radius: 1px;
  }
`;

const MeetingsWidget = ({ notifications }) => {
  const [showPopup, setShowPopup] = useState(false);
  const today = new Date();
  
  // Get today's accepted viewings
  const todayViewings = notifications.filter(notification => {
    return notification.data?.reservations?.some(reservation => {
      return (
        reservation.status === 'accepted' &&
        isSameDay(new Date(reservation.date), today)
      );
    });
  });

  // Group accepted viewings by time
  const viewingsByTime = todayViewings.reduce((acc, notification) => {
    notification.data.reservations
      .filter(reservation => 
        reservation.status === 'accepted' &&
        isSameDay(new Date(reservation.date), today)
      )
      .forEach(reservation => {
        const timeKey = reservation.startTime;
        if (!acc[timeKey]) {
          acc[timeKey] = [];
        }
        acc[timeKey].push({
          username: notification.from?.username,
          property: notification.data.listing?.name,
          id: notification._id,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        });
      });
    return acc;
  }, {});

  return (
    <MeetingsStyledWrapper>
      <div className="card">
        <div className="bg">
          <div className="content">
            <h3>Today's Meetings</h3>
            {Object.entries(viewingsByTime).length === 0 ? (
              <p className="no-meetings">No meetings scheduled for today</p>
            ) : (
              Object.entries(viewingsByTime).map(([time, meetings]) => (
                <div key={time} className="meeting-time">
                  <div className="time-header">
                    <span 
                      className="meeting-count cursor-pointer hover:text-blue-500"
                      onClick={() => setShowPopup(true)}
                    >
                      {meetings.length} meeting{meetings.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {meetings.map((meeting, index) => (
                    <div key={meeting.id} className="meeting-item">
                      <span className="username">{meeting.username}</span>
                      <span className="time-range">{meeting.startTime} - {meeting.endTime}</span>
                      <span className="property">{meeting.property}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="blob" />
      </div>
      <MeetingPopup 
        open={showPopup} 
        onClose={() => setShowPopup(false)}
        viewings={todayViewings}
      />
    </MeetingsStyledWrapper>
  );
};

const MeetingPopup = ({ open, onClose, viewings }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[60]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.3
        }}
        className="bg-white/95 p-6 rounded-2xl shadow-xl max-w-md w-full backdrop-blur-lg border border-white/20"
      >
        <h3 className="text-lg font-semibold mb-4">Available Meetings Today</h3>
        
        {viewings.length === 0 ? (
          <p className="text-gray-600 text-center">No meetings available for today</p>
        ) : (
          <div className="space-y-4">
            {viewings.map((viewing, index) => (
              <motion.div
                key={viewing._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="border-b border-white/10 pb-4 last:border-0"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{viewing.from?.username}</h4>
                  <span className="text-sm text-gray-500">{viewing.data?.listing?.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewing.data?.reservations?.map((reservation, idx) => (
                    <button
                      key={idx}
                      className="px-3 py-1 rounded-full bg-blue-500/90 text-white text-sm hover:bg-blue-600/90 transition-all duration-200"
                    >
                      {reservation.startTime} - {reservation.endTime}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + viewings.length * 0.05 }}
          onClick={onClose}
          className="w-full mt-6 bg-gray-200/90 text-gray-800 py-2 rounded-full hover:bg-gray-300/90 transition-all duration-200"
        >
          Close
        </motion.button>
      </motion.div>
    </div>
  );
};

const MeetingsStyledWrapper = styled.div`
  .card {
    position: relative;
    width: 246px;
    height: 350px;
    border-radius: 12px;
    z-index: 1111;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #ffffff;
  }

  .bg {
    position: absolute;
    top: 5px;
    left: 5px;
    width: 236px;
    height: 340px;
    z-index: 2;
    background: rgba(255, 255, 255, .95);
    backdrop-filter: blur(24px);
    border-radius: 10px;
    overflow: hidden;
    outline: 2px solid white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  .content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
  }

  .no-meetings {
    font-size: 14px;
    color: #666;
    text-align: center;
    margin-top: 100px;
  }

  .meeting-time {
    width: 100%;
    margin-bottom: 15px;
  }

  .time-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 10px;
  }

  .meeting-count {
    font-size: 12px;
    color: #353386;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px 8px;
    border-radius: 12px;
    background: rgba(53, 51, 134, 0.1);
    border: 1px solid rgba(53, 51, 134, 0.2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .meeting-count:hover {
    background: rgba(53, 51, 134, 0.2);
    border-color: rgba(53, 51, 134, 0.3);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .meeting-count:active {
    background: rgba(53, 51, 134, 0.3);
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .meeting-count::after {
    content: "↓";
    margin-left: 4px;
    font-size: 10px;
    color: #353386;
    transition: transform 0.2s ease;
  }

  .meeting-count:hover::after {
    transform: translateY(2px);
  }

  .meeting-item {
    font-size: 13px;
    color: #333;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    margin-top: 4px;
    background-color: #f3f4f6;
    border-radius: 6px;
  }

  .time-range {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 4px;
  }

  .username {
    font-weight: 500;
    display: block;
    margin-bottom: 2px;
  }

  .property {
    color: #666;
    font-size: 11px;
  }

  .blob {
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
    width: 246px;
    height: 350px;
    border-radius: 12px;
    background-color: #353386;
    opacity: 1;
    filter: blur(12px);
    animation: blob-flow 10s infinite ease-in-out;
  }

  @keyframes blob-flow {
    0% {
      transform: translate(0, 0);
    }

    12.5% {
      transform: translate(100%, 0);
    }

    25% {
      transform: translate(100%, 100%);
    }

    37.5% {
      transform: translate(0, 100%);
    }

    50% {
      transform: translate(-100%, 100%);
    }

    62.5% {
      transform: translate(-100%, 0);
    }

    75% {
      transform: translate(-100%, -100%);
    }

    87.5% {
      transform: translate(0, -100%);
    }

    100% {
      transform: translate(0, 0);
    }
  }
`;

const MeetingPopupWrapper = styled.div`
  .meeting-count {
    font-size: 12px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .meeting-count:hover {
    color: #353386;
    transform: translateY(-1px);
  }
`;

const Schedule = () => {
  const { currentUser, isAgent } = useSelector((state) => state.user);
  const [scheduleNotifications, setScheduleNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('accepted');
  const [showRejectionReasonPopup, setShowRejectionReasonPopup] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showAcceptMorePopup, setShowAcceptMorePopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [blurredNotifications, setBlurredNotifications] = useState(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasListings, setHasListings] = useState(false);
  const [showMessagingWidget, setShowMessagingWidget] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    setActiveTab('accepted');
  }, []);

  useEffect(() => {
    localStorage.setItem('scheduleActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/notifications/schedule/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch notifications');
        }

        const data = await res.json();
        
        if (data.success) {
          // Process notifications to ensure consistent data structure
          const processedNotifications = data.notifications.map(notification => {
            // Ensure reservations is always an array
            if (notification.data) {
              notification.data.reservations = notification.data.reservations || 
                (notification.data.reservation ? [notification.data.reservation] : []);
            }
            return notification;
          });
          
          console.log('Debug - Processed Notifications:', JSON.stringify(processedNotifications, null, 2));
          console.log('Debug - User has listings:', hasListings);
          
          setScheduleNotifications(processedNotifications);
        } else {
          throw new Error(data.message || 'Failed to fetch notifications');
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError(error.message || 'Failed to fetch notifications');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id && currentUser?.token) {
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    // Check if user has listings
    const checkListings = async () => {
      try {
        const res = await fetch(`/api/listing/user/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        const data = await res.json();
        setHasListings(data.listings && data.listings.length > 0);
      } catch (error) {
        console.error('Error checking listings:', error);
      }
    };

    if (currentUser?._id && currentUser?.token) {
      checkListings();
    }
  }, [currentUser, activeTab]);

  const handleAcceptViewing = async (notificationId, reservationId) => {
    try {
      // Find the notification and reservation details
      const notification = scheduleNotifications.find(n => n._id === notificationId);
      const reservation = notification?.data?.reservations?.find(r => r._id === reservationId);
      
      if (!notification || !reservation) {
        throw new Error('Notification or reservation not found');
      }

      const response = await fetch(`/api/reservation/accept/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept viewing request');
      }

      // Create acceptance notification
      const contactInfo = [];
      if (currentUser.email) {
        contactInfo.push(currentUser.email);
      }
      if (currentUser.phoneNumber) {
        contactInfo.push(currentUser.phoneNumber);
      }
      
      const contactText = contactInfo.length > 0 
        ? `please reach out to me at ${contactInfo.join(' or ')}` 
        : 'please reach out through the JustListIt messaging';

      const notificationTitle = 'Viewing Request Accepted';
      const notificationContent = `I am available to meet with you to view the property at ${notification.data.listing.name} at the specified time. For more information or any questions you may have, ${contactText}. See you then!`;

      await fetch('http://localhost:3000/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'system',
          title: notificationTitle,
          content: notificationContent,
          message: notificationContent,
          from: currentUser._id,
          to: notification.from._id,
          read: false,
          systemInfo: {
            name: currentUser.username,
            avatar: currentUser.avatar,
            timeSlots: [{
              day: format(new Date(reservation.date), 'EEEE').toLowerCase(),
              time: reservation.startTime,
              end: reservation.endTime
            }]
          },
          data: {
            reservationId: reservationId,
            listingId: notification.data.listing._id,
            type: 'viewing_accepted',
            listing: notification.data.listing,
            message: notificationContent,
            from: {
              _id: currentUser._id,
              username: currentUser.username,
              email: currentUser.email,
              avatar: currentUser.avatar,
              phone: currentUser.phoneNumber
            }
          },
          status: 'accepted'
        })
      });

      // Update the notifications state to reflect the acceptance
      setScheduleNotifications(prevNotifications => 
        prevNotifications.map(notification => {
          if (notification._id === notificationId) {
            return {
              ...notification,
              data: {
                ...notification.data,
                reservations: notification.data.reservations.map(res => 
                  res._id === reservationId 
                    ? { ...res, status: 'accepted' }
                    : res
                )
              }
            }
          }
          return notification;
        })
      );

      toast.success('Viewing request accepted successfully');

      // Check if there are more pending times for this notification
      const updatedNotification = scheduleNotifications.find(n => n._id === notificationId);
      const remainingPendingTimes = updatedNotification.data.reservations.filter(
        r => !r.status || r.status === 'pending'
      ).length;

      if (remainingPendingTimes > 0) {
        setCurrentNotification(updatedNotification);
        setShowAcceptMorePopup(true);
      } else {
        setActiveTab('accepted');
      }
    } catch (error) {
      console.error('Error accepting viewing request:', error);
      toast.error(error.message || 'Error accepting viewing request');
    }
  };

  const handleDoneAccepting = (notificationId) => {
    setBlurredNotifications(prev => new Set([...prev, notificationId]));
    setShowAcceptMorePopup(false);
    setCurrentNotification(null);
    setActiveTab('accepted');
  };

  const getFilteredNotifications = () => {
    return scheduleNotifications.filter(notification => {
      const reservations = notification.data?.reservations || [];
      switch (activeTab) {
        case 'pending':
          return reservations.some(r => !r.status || r.status === 'pending');
        case 'accepted':
          return reservations.some(r => r.status === 'accepted');
        case 'rejected':
          return reservations.some(r => r.status === 'rejected');
        default:
          return true;
      }
    });
  };

  const getAcceptedViewings = () => {
    return scheduleNotifications.flatMap(notification => 
      (notification.data?.reservations || [])
        .filter(r => r.status === 'accepted')
        .map(r => ({
          ...r,
          listing: notification.data.listing,
          viewer: notification.from
        }))
    );
  };

  const renderTabContent = () => {
    const filteredNotifications = getFilteredNotifications();
    
    if (activeTab === 'accepted') {
      const acceptedViewings = getAcceptedViewings();
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="accepted-tab-content"
        >
          <div className="widgets-container">
            <div className="widgets-row">
              <MeetingsWidget notifications={scheduleNotifications} />
              <MessagingWidget />
              <WeatherWidget />
            </div>
          </div>
          <div className="viewings-section">
          
            <ViewingCalendar acceptedViewings={acceptedViewings} />
            <div className="bg-white rounded-lg shadow mb-6">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    View Schedule Notifications
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 transform transition-transform ${showNotifications ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              {showNotifications && (
                <div className="p-4">
                  <div className="space-y-4">
                    {filteredNotifications.map(notification => renderNotificationItem(notification))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredNotifications.map(notification => renderNotificationItem(notification))}
      </div>
    );
  };

  const renderNotificationItem = (notification) => {
    const reservations = notification.data?.reservations || [];
    const listing = notification.data?.listing;
    const viewer = notification.from;
    
    // Filter reservations based on tab
    const relevantReservations = activeTab === 'rejected' 
      ? reservations.filter(r => r.status === 'rejected')
      : reservations;
    
    // If no relevant reservations for this tab, don't show the notification
    if (relevantReservations.length === 0) return null;

    // Check if any reservation is pending
    const hasPendingReservations = reservations.some(r => r.status === 'pending');
    const pendingReservations = reservations.filter(r => r.status === 'pending');
    const isBlurred = blurredNotifications.has(notification._id) || activeTab === 'accepted';
    
    return (
      <div key={notification._id} className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {listing?.name || 'Property Viewing Request'}
            </h3>
            <p className="text-gray-600">
              {viewer?.username || 'Anonymous'} ({viewer?.email})
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(notification.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">
            {activeTab === 'rejected' ? 'Rejected Times:' : 'Requested Viewing Times:'}
          </h4>
          <div className="space-y-2">
            {relevantReservations.map(reservation => {
              const isAccepted = reservation.status === 'accepted';
              const showDetails = !isBlurred || isAccepted;
              
              return (
                <div 
                  key={reservation._id} 
                  className={`p-2 rounded ${
                    activeTab === 'rejected' ? 'bg-red-50 border border-red-100' :
                    isAccepted ? 'bg-green-100' : 'bg-gray-100'
                  } ${!showDetails ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">
                        {new Date(reservation.date).toLocaleDateString()}{' '}
                        {reservation.startTime} - {reservation.endTime}
                      </p>
                      {activeTab === 'rejected' && reservation.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {reservation.rejectionReason}
                        </p>
                      )}
                      {activeTab !== 'rejected' && showDetails && (
                        <>
                          <p className="text-sm capitalize text-gray-600">
                            Status: {reservation.status || 'pending'}
                          </p>
                          {reservation.rejectionReason && (
                            <p className="text-sm text-red-600">
                              Reason: {reservation.rejectionReason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {(!reservation.status || reservation.status === 'pending') && !isBlurred && activeTab !== 'rejected' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptViewing(notification._id, reservation._id)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNotification({
                              _id: notification._id,
                              pendingReservations: [reservation]
                            });
                            setShowRejectionReasonPopup(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show action buttons only if there are pending reservations and not blurred */}
        {hasPendingReservations && !isBlurred && activeTab !== 'rejected' && (
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                // Accept all pending reservations
                pendingReservations.forEach(r => 
                  handleAcceptViewing(notification._id, r._id)
                );
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Accept All
            </button>
            <button
              onClick={() => {
                setSelectedNotification({
                  _id: notification._id,
                  pendingReservations
                });
                setShowRejectionReasonPopup(true);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reject All
            </button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { label: 'Pending', value: 'pending' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const handleRejectViewing = async (notificationId, reservationId, reason) => {
    try {
      const res = await fetch(`/api/reservation/reject/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reject viewing');
      }

      const notification = scheduleNotifications.find(n => n._id === notificationId);
      const reservation = notification?.data?.reservations?.find(r => r._id === reservationId);
      
      if (notification && reservation) {
        // Create rejection notification
        const contactInfo = [];
        if (currentUser.email) contactInfo.push(currentUser.email);
        if (currentUser.phoneNumber) contactInfo.push(currentUser.phoneNumber);
        
        const contactText = contactInfo.length > 0 
          ? `You can reach me at ${contactInfo.join(' or ')}` 
          : 'You can message me through the JustListIt in-house messaging';

        const notificationTitle = 'Viewing Request Rejected';
        const notificationContent = `Unfortunately, I will be unavailable at ${reservation.startTime} - ${reservation.endTime} on ${new Date(reservation.date).toLocaleDateString()} because ${reason}. I will reschedule with you. If you feel I am taking too long to reschedule, ${contactText}.`;

        await fetch('http://localhost:3000/api/notifications/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'system',
            title: notificationTitle,
            content: notificationContent,
            message: notificationContent,  
            from: currentUser._id,
            to: notification.from._id,
            read: false,
            systemInfo: {
              name: currentUser.username,
              avatar: currentUser.avatar,
              timeSlots: [{
                day: format(new Date(reservation.date), 'EEEE').toLowerCase(),
                time: reservation.startTime,
                end: reservation.endTime
              }]
            },
            data: {
              reservationId: reservationId,
              listingId: notification.data.listing._id,
              type: 'viewing_rejection',
              listing: notification.data.listing,
              message: notificationContent,  
              from: {
                _id: currentUser._id,
                username: currentUser.username,
                email: currentUser.email,
                avatar: currentUser.avatar,
                phone: currentUser.phoneNumber
              }
            },
            status: 'pending'
          })
        });
      }

      // Update the local state
      setScheduleNotifications(prev => prev.map(notification => {
        if (notification._id === notificationId) {
          return {
            ...notification,
            data: {
              ...notification.data,
              reservations: notification.data.reservations.map(reservation => 
                reservation._id === reservationId 
                  ? { ...reservation, status: 'rejected', rejectionReason: reason }
                  : reservation
              )
            }
          }
        }
        return notification;
      }));

      toast.success('Viewing request rejected');
    } catch (error) {
      console.error('Error rejecting viewing:', error);
      toast.error(error.message || 'Failed to reject viewing');
    }
  };

  const handleRejectionReasonSubmit = async (rejectionDetails) => {
    try {
      const { reason, alternativeDateTime, otherReason } = rejectionDetails;
      
      if (!selectedNotification) {
        throw new Error('No notification selected');
      }

      const pendingReservations = selectedNotification.pendingReservations;
      if (!pendingReservations || pendingReservations.length === 0) {
        throw new Error('No pending reservations found');
      }

      // Format the rejection reason
      let formattedReason = '';
      if (reason === 'time_not_suitable' && alternativeDateTime) {
        const date = new Date(alternativeDateTime.date);
        formattedReason = `Time not suitable. Alternative time suggested: ${date.toLocaleDateString()} from ${alternativeDateTime.startTime} to ${alternativeDateTime.endTime}`;
      } else if (reason === 'overbooked') {
        formattedReason = 'Viewing request rejected due to being overbooked.';
      } else if (reason === 'other' && otherReason) {
        formattedReason = `Viewing request rejected. Reason: ${otherReason}`;
      } else {
        formattedReason = 'Viewing request rejected.';
      }

      // Reject all pending reservations
      await Promise.all(
        pendingReservations.map(reservation =>
          handleRejectViewing(selectedNotification._id, reservation._id, formattedReason)
        )
      );

      setShowRejectionReasonPopup(false);
      setSelectedNotification(null);
      toast.success('Viewing requests rejected successfully');

    } catch (error) {
      console.error('Error rejecting viewing requests:', error);
      toast.error(error.message || 'Error rejecting viewing requests');
    }
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center text-red-500 mt-4">
        {error}
      </div>
    );
  }

  return (
    <StyledSchedule>
      <div className="max-w-6xl mx-auto p-4">
        <div className="schedule-title-container">
          <div className="schedule-backdrop">SCHEDULE</div>
          <h1 className="schedule-title text-3xl font-semibold mt-11 mb-4"> Management</h1>
          {showMessagingWidget && selectedUser && (
            <MessagingWidget user={selectedUser} onClose={() => setShowMessagingWidget(false)} />
          )}
        </div>
        <div className="mb-6">
          <div className="flex space-x-4">
            {(isAgent || hasListings) && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'pending'
                    ? 'bg-slate-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
            )}
            <button
              onClick={() => setActiveTab('accepted')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'accepted'
                  ? 'bg-slate-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'rejected'
                  ? 'bg-slate-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          renderTabContent()
        )}

        {showAcceptMorePopup && currentNotification && (
          <AcceptMorePopup
            onClose={() => handleDoneAccepting(currentNotification._id)}
            onAcceptMore={() => {
              setShowAcceptMorePopup(false);
              setCurrentNotification(null);
            }}
            remainingTimes={
              currentNotification.data.reservations.filter(
                r => !r.status || r.status === 'pending'
              ).length
            }
          />
        )}

        {showRejectionReasonPopup && (
          <RejectionReasonPopup
            onClose={() => {
              setShowRejectionReasonPopup(false);
              setSelectedNotification(null);
            }}
            onSubmit={handleRejectionReasonSubmit}
          />
        )}
      </div>
    </StyledSchedule>
  );
}

const StyledSchedule = styled.div`
  position: relative;
  overflow: hidden;

  .schedule-backdrop {
    position: absolute;
    top: -50px;
    left: 0;
    font-size: 8rem;
    font-weight: 900;
    color: #E2E1ED;
    pointer-events: none;
    user-select: none;
    z-index: -1;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .schedule-title-container {
    position: relative;
    padding: 1rem;
    left: 0%;
  }

  .schedule-title {
    position: relative;
    z-index: 1;
  }

  .accepted-tab-content {
    padding: 20px;
    left: 0%;
  }

  .accepted-weather {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .widgets-container {
    margin-bottom: 30px;
    position: relative;
    z-index: 1;
  }

  .widgets-row {
    display: flex;
    gap: 78px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .viewings-section {
    h2 {
      margin-bottom: 20px;
      text-align: center;
    }
  }
`;
export default Schedule;
