import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import local images
import heroImage from '../assets/hero-image.png';
import entranceImage from '../assets/entrance-image.jpg';
import livingRoomImage from '../assets/living-room.jpg';
import kitchenImage from '../assets/kitchen.jpg';
import masterSuiteImage from '../assets/master-suite.jpg';
import bathroomImage from '../assets/bathroom.jpg';
import guestSuiteImage from '../assets/guest-suite.jpg';
import terraceImage from '../assets/terrace.jpg';
import finalSectionImage from '../assets/final-section.jpg';

gsap.registerPlugin(ScrollTrigger);

const zoomKeyframes = `
@keyframes gentleZoom {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = zoomKeyframes;
document.head.appendChild(styleTag);

export default function Landing() {
  const mainRef = useRef(null);
  const sectionsRef = useRef([]);
  const ctx = useRef();

  useEffect(() => {
    ctx.current = gsap.context(() => {
      // Set initial states for all text elements
      gsap.set([
        '.hero-title', '.hero-description', '.hero-buttons',
        '.entrance-title', '.entrance-description',
        '.living-title', '.living-description',
        '.kitchen-title', '.kitchen-description',
        '.master-suite-title', '.master-suite-desc',
        '.bathroom-title', '.bathroom-desc',
        '.guest-suite-title', '.guest-suite-desc',
        '.terrace-title', '.terrace-desc',
        '.experience-title', '.experience-desc', '.experience-buttons'
      ], {
        y: 50,
        opacity: 0
      });

      // Set initial states for sections
      gsap.set(['.hero-section', '.entrance-section', '.living-room-section', '.kitchen-section'], {
        opacity: 0,
        y: 100,
        scale: 0.95
      });

      // Section reveal animations
      ['.hero-section', '.entrance-section', '.living-room-section', '.kitchen-section'].forEach((section, index) => {
        gsap.to(section, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 20%',
            toggleActions: 'play none none reverse',
            scrub: 1
          }
        });
      });

      // Reveal animations for each section's text
      const revealSections = [
        {
          trigger: sectionsRef.current[0],
          elements: ['.hero-title', '.hero-description', '.hero-buttons']
        },
        {
          trigger: sectionsRef.current[1],
          elements: ['.entrance-title', '.entrance-description']
        },
        {
          trigger: sectionsRef.current[2],
          elements: ['.living-title', '.living-description']
        },
        {
          trigger: sectionsRef.current[3],
          elements: ['.kitchen-title', '.kitchen-description']
        }
      ];

      // Create reveal animations
      revealSections.forEach(section => {
        section.elements.forEach((element, index) => {
          gsap.to(element, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: index * 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section.trigger,
              start: 'top center',
              end: 'center center',
              toggleActions: 'play none none reverse'
            }
          });
        });
      });

      // Parallax effect for the first 4 sections
      const parallaxSections = [
        { bg: '.hero-bg', content: '.hero-content' },
        { bg: '.entrance-bg', content: '.entrance-content' },
        { bg: '.living-room-bg', content: '.living-room-content' },
        { bg: '.kitchen-bg', content: '.kitchen-content' }
      ];

      // Existing parallax animations
      parallaxSections.forEach((section, index) => {
        gsap.to(section.bg, {
          yPercent: 80,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionsRef.current[index],
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          }
        });

        gsap.to(section.content, {
          y: 0,
          scrollTrigger: {
            trigger: sectionsRef.current[index],
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          }
        });
      });

      // Horizontal scroll for rooms section
      const roomsSection = document.querySelector('.rooms-section');
      if (roomsSection) {
        // Create separate timelines for each room
        const rooms = [
          {
            title: '.master-suite-title',
            desc: '.master-suite-desc',
            start: 0,
            end: 0.25
          },
          {
            title: '.bathroom-title',
            desc: '.bathroom-desc',
            start: 0.25,
            end: 0.5
          },
          {
            title: '.guest-suite-title',
            desc: '.guest-suite-desc',
            start: 0.5,
            end: 0.75
          },
          {
            title: '.terrace-title',
            desc: '.terrace-desc',
            start: 0.75,
            end: 1
          }
        ];

        // Main horizontal scroll animation
        gsap.to('.rooms-wrapper', {
          x: () => -(document.querySelector('.rooms-wrapper').scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: '.rooms-section',
            pin: true,
            start: 'top top',
            end: '+=300%',
            scrub: 1,
            onUpdate: self => {
              // Animate room texts based on scroll progress
              rooms.forEach(room => {
                if (self.progress >= room.start && self.progress <= room.end) {
                  const progress = (self.progress - room.start) / (room.end - room.start);
                  
                  // Animate title
                  gsap.to(room.title, {
                    y: 0,
                    opacity: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                  });
                  
                  // Animate description with slight delay
                  gsap.to(room.desc, {
                    y: 0,
                    opacity: 1,
                    duration: 0.4,
                    delay: 0.2,
                    ease: 'power2.out'
                  });
                } else if (self.progress < room.start) {
                  // Reset if not yet reached
                  gsap.set([room.title, room.desc], {
                    y: 50,
                    opacity: 0
                  });
                }
              });
            }
          }
        });
      }

      // Experience section animation
      gsap.to('.final-section', {
        scrollTrigger: {
          trigger: '.final-section',
          start: 'top bottom',
          end: 'top center',
          onEnter: () => {
            gsap.to('.experience-title', {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power2.out'
            });
            gsap.to('.experience-desc', {
              y: 0,
              opacity: 1,
              duration: 0.8,
              delay: 0.2,
              ease: 'power2.out'
            });
            gsap.to('.experience-buttons', {
              y: 0,
              opacity: 1,
              duration: 0.8,
              delay: 0.4,
              ease: 'power2.out'
            });
          },
          onLeaveBack: () => {
            gsap.set(['.experience-title', '.experience-desc', '.experience-buttons'], {
              y: 50,
              opacity: 0
            });
          }
        }
      });
    }, mainRef);

    return () => ctx.current.revert();
  }, []);

  return (
    <div ref={mainRef} className="w-full overflow-hidden bg-white text-white">
      {/* Hero Section */}
      <section 
        ref={el => sectionsRef.current[0] = el}
        className="hero-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg"
      >
        <div 
          className="hero-bg absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundPosition: 'center 70%',
            animationDuration: '10s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
        <div className="hero-content absolute inset-0 flex items-center justify-center bg-black/30 rounded-3xl">
          <div className="text-center space-y-6 px-4">
            <h1 className="hero-title text-6xl md:text-8xl font-bold">Luxury Living Awaits</h1>
            <p className="hero-description text-xl md:text-2xl">Step inside your dream home</p>
            <div className="hero-buttons flex justify-center space-x-4">
              <Link 
                to="/contact" 
                className="bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-colors"
              >
                Schedule Tour
              </Link>
              <Link 
                to="/gallery" 
                className="border-2 border-white px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* White Divider */}
      <div className="h-4 bg-white w-full"></div>

      {/* Grand Entrance */}
      <section 
        ref={el => sectionsRef.current[1] = el}
        className="entrance-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg"
      >
        <div 
          className="entrance-bg absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
          style={{
            backgroundImage: `url(${entranceImage})`,
            animationDuration: '12s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
        <div className="entrance-content absolute inset-0 bg-black/30 rounded-3xl">
          <div className="content absolute inset-0 flex items-center justify-end bg-black/30 rounded-3xl">
            <div className="max-w-lg mr-20 space-y-6">
              <h2 className="entrance-title text-5xl font-bold">Welcome Inside</h2>
              <p className="entrance-description text-xl">
                Step through our grand entrance, where soaring ceilings and 
                elegant details set the tone for luxury living.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* White Divider */}
      <div className="h-4 bg-white w-full"></div>

      {/* Living Room */}
      <section 
        ref={el => sectionsRef.current[2] = el}
        className="living-room-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg"
      >
        <div 
          className="living-room-bg absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
          style={{
            backgroundImage: `url(${livingRoomImage})`,
            animationDuration: '14s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
        <div className="living-room-content absolute inset-0 flex items-center justify-start bg-black/30 rounded-3xl">
          <div className="max-w-lg ml-20 space-y-6">
            <h2 className="living-title text-5xl font-bold">Elegant Living Space</h2>
            <p className="living-description text-xl">
              Experience the perfect blend of comfort and sophistication in our 
              thoughtfully designed living spaces.
            </p>
          </div>
        </div>
      </section>

      {/* White Divider */}
      <div className="h-4 bg-white w-full"></div>

      {/* Kitchen */}
      <section 
        ref={el => sectionsRef.current[3] = el}
        className="kitchen-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg"
      >
        <div 
          className="kitchen-bg absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
          style={{
            backgroundImage: `url(${kitchenImage})`,
            animationDuration: '16s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
        <div className="kitchen-content absolute inset-0 flex items-center justify-end bg-black/30 rounded-3xl">
          <div className="max-w-lg mr-20 space-y-6">
            <h2 className="kitchen-title text-5xl font-bold">Chef's Kitchen</h2>
            <p className="kitchen-description text-xl">
              A gourmet kitchen that combines stunning design with professional-grade 
              appliances for the ultimate culinary experience.
            </p>
          </div>
        </div>
      </section>

      {/* White Divider */}
      <div className="h-4 bg-white w-full"></div>

      {/* Rooms Section (Horizontal Scroll) */}
      <section className="rooms-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg">
        <div className="rooms-wrapper flex h-full">
          {/* Master Bedroom */}
          <div className="w-screen h-full relative flex-shrink-0">
            <div 
              className="absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
              style={{
                backgroundImage: `url(${masterSuiteImage})`,
                animationDuration: '10s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite'
              }}
            />
            <div className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center">
              <div className="text-center max-w-lg space-y-6">
                <h3 className="master-suite-title text-4xl font-bold mb-4">Master Suite</h3>
                <p className="master-suite-desc text-xl">Your private retreat with stunning views and luxury amenities</p>
              </div>
            </div>
          </div>

          {/* White Divider */}
          <div className="w-4 h-full bg-white flex-shrink-0"></div>

          {/* Master Bathroom */}
          <div className="w-screen h-full relative flex-shrink-0">
            <div 
              className="absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
              style={{
                backgroundImage: `url(${bathroomImage})`,
                animationDuration: '12s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite'
              }}
            />
            <div className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center">
              <div className="text-center max-w-lg space-y-6">
                <h3 className="bathroom-title text-4xl font-bold mb-4">Spa-Like Bathroom</h3>
                <p className="bathroom-desc text-xl">Indulge in luxury with premium fixtures and elegant design</p>
              </div>
            </div>
          </div>

          {/* White Divider */}
          <div className="w-4 h-full bg-white flex-shrink-0"></div>

          {/* Guest Bedroom */}
          <div className="w-screen h-full relative flex-shrink-0">
            <div 
              className="absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
              style={{
                backgroundImage: `url(${guestSuiteImage})`,
                animationDuration: '14s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite'
              }}
            />
            <div className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center">
              <div className="text-center max-w-lg space-y-6">
                <h3 className="guest-suite-title text-4xl font-bold mb-4">Guest Suite</h3>
                <p className="guest-suite-desc text-xl">Comfortable accommodations for your guests</p>
              </div>
            </div>
          </div>

          {/* White Divider */}
          <div className="w-4 h-full bg-white flex-shrink-0"></div>

          {/* Outdoor Space */}
          <div className="w-screen h-full relative flex-shrink-0">
            <div 
              className="absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
              style={{
                backgroundImage: `url(${terraceImage})`,
                animationDuration: '16s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite'
              }}
            />
            <div className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center">
              <div className="text-center max-w-lg space-y-6">
                <h3 className="terrace-title text-4xl font-bold mb-4">Private Terrace</h3>
                <p className="terrace-desc text-xl">Enjoy outdoor living with panoramic views</p>
              </div>
            </div>
          </div>

          {/* Right Gap */}
          <div className="w-9 h-full bg-white flex-shrink-0"></div>
        </div>
      </section>

      {/* White Divider */}
      <div className="h-4 bg-white w-full"></div>

      {/* Call to Action */}
      <section 
        ref={el => sectionsRef.current[4] = el}
        className="final-section h-screen relative overflow-hidden mx-4 my-4 rounded-3xl shadow-lg"
      >
        <div 
          className="bg-image absolute inset-0 bg-cover bg-center rounded-3xl animate-gentleZoom origin-center"
          style={{
            backgroundImage: `url(${finalSectionImage})`,
            animationDuration: '10s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
        <div className="content absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl">
          <div className="text-center space-y-8">
            <h2 className="experience-title text-5xl font-bold">Experience Luxury Living</h2>
            <p className="experience-desc text-xl max-w-2xl mx-auto">
              Ready to make this dream home yours? Schedule a private tour today.
            </p>
            <div className="experience-buttons flex gap-4 justify-center">
              <Link 
                to="/contact" 
                className="bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-colors"
              >
                Schedule Tour
              </Link>
              <Link 
                to="/gallery" 
                className="border-2 border-white px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
