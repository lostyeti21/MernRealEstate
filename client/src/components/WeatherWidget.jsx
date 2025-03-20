import React, { useState, useEffect } from 'react';
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
                <path fill="#4A4973" d="M32,0C18.746,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z" />
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #fff;
    top: 20px;
    right: 20px;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  .sun-shine-1,
  .sun-shine-2 {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    animation: sun-shine 3s infinite;
  }

  .sun-shine-2 {
    animation-delay: -1.5s;
  }

  @keyframes sun-shine {
    0% {
      transform: scale(1);
      opacity: 0;
    }
    50% {
      transform: scale(1.5);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  .hill-1,
  .hill-2,
  .hill-3,
  .hill-4 {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background-color: #47567F;
  }

  .hill-1 {
    bottom: -120px;
    left: -50px;
  }

  .hill-2 {
    bottom: -150px;
    right: -80px;
    width: 250px;
    height: 250px;
    background-color: #354262;
  }

  .hill-3 {
    bottom: -150px;
    left: 50px;
    width: 150px;
    height: 150px;
    background-color: #4A4973;
  }

  .hill-4 {
    bottom: -180px;
    right: 50px;
    width: 180px;
    height: 180px;
    background-color: #354262;
  }

  .tree-1,
  .tree-2,
  .tree-3 {
    width: 30px;
    height: 30px;
    bottom: 50px;
  }

  .tree-1 {
    left: 30px;
  }

  .tree-2 {
    left: 50%;
    transform: translateX(-50%);
  }

  .tree-3 {
    right: 30px;
  }

  .filter {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .content-section {
    width: 100%;
    padding: 1rem;
  }

  .weather-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .left-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  .right-side {
    text-align: right;
  }

  .location {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .location svg {
    width: 16px;
    height: 16px;
  }

  .temperature {
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 0.5rem;
  }

  .forecast {
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .forecast > div {
    flex: 1;
  }

  .separator {
    width: 1px;
    height: 30px;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .forecast p:first-child {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .forecast p:last-child {
    font-weight: bold;
  }