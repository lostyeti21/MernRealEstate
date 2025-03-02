import React, { useState } from 'react';
import Background from '../components/Background';
import { MdChevronRight } from 'react-icons/md';

export default function Tutorials() {
  const [activeSection, setActiveSection] = useState('sop');

  return (
    <div className="relative min-h-screen bg-white dark:bg-dark-background">
      <Background />
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-64 pr-8 border-r dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">
              Tutorial Sections
            </h2>
            <nav>
              <button 
                onClick={() => setActiveSection('sop')}
                className={`w-full text-left px-4 py-2 rounded mb-2 flex items-center ${
                  activeSection === 'sop' 
                    ? 'bg-[#009688] text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MdChevronRight className="mr-2" />
                How to Sign Into Your Account
              </button>
              <button 
                onClick={() => setActiveSection('create-account')}
                className={`w-full text-left px-4 py-2 rounded mb-2 flex items-center ${
                  activeSection === 'create-account' 
                    ? 'bg-[#009688] text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MdChevronRight className="mr-2" />
                How to Create an Account
              </button>
              <button 
                onClick={() => setActiveSection('search-properties')}
                className={`w-full text-left px-4 py-2 rounded mb-2 flex items-center ${
                  activeSection === 'search-properties' 
                    ? 'bg-[#009688] text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MdChevronRight className="mr-2" />
                How to Search for Properties
              </button>
              <button 
                onClick={() => setActiveSection('rating-verification')}
                className={`w-full text-left px-4 py-2 rounded mb-2 flex items-center ${
                  activeSection === 'rating-verification' 
                    ? 'bg-[#009688] text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MdChevronRight className="mr-2" />
                Where Can I Find My Rating Verification Code
              </button>
              <button 
                onClick={() => setActiveSection('rate-user')}
                className={`w-full text-left px-4 py-2 rounded mb-2 flex items-center ${
                  activeSection === 'rate-user' 
                    ? 'bg-[#009688] text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MdChevronRight className="mr-2" />
                How Can I Rate a User
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 pl-8">
            {activeSection === 'sop' && (
              <div>
                <h1 className="text-4xl font-bold mb-8 text-slate-800 dark:text-white">
                  How to Sign Into Your Account
                </h1>
                
                <div className="space-y-8">
                  <div className="bg-white dark:bg-dark-secondary shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">
                      Sign In Process
                    </h2>
                    <div className="w-full aspect-video">
                      <iframe 
                        src="https://app.supademo.com/embed/cm7ndlxnc0253i0nhi8tws1lv?embed_v=2" 
                        loading="lazy" 
                        title="Supademo Demo" 
                        allow="clipboard-write" 
                        frameBorder="0" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true" 
                        allowFullScreen 
                        className="w-full h-full rounded-lg shadow-md"
                      ></iframe>
                    </div>
                    <div className="mt-6 text-center">
                      <a 
                        href="https://app.supademo.com/demo/cm7ndlxnc0253i0nhi8tws1lv" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-[#009688] hover:underline"
                      >
                        View Full Demo on Supademo
                        <MdChevronRight className="ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'create-account' && (
              <div>
                <h1 className="text-4xl font-bold mb-8 text-slate-800 dark:text-white">
                  How to Create an Account
                </h1>
                
                <div className="space-y-8">
                  <div className="bg-white dark:bg-dark-secondary shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">
                      Account Creation Process
                    </h2>
                    <div className="w-full aspect-video">
                      <iframe 
                        src="https://app.supademo.com/embed/cm7nekm3o02rwi0nh5jwc9bvt?embed_v=2" 
                        loading="lazy" 
                        title="Supademo Demo" 
                        allow="clipboard-write" 
                        frameBorder="0" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true" 
                        allowFullScreen 
                        className="w-full h-full rounded-lg shadow-md"
                      ></iframe>
                    </div>
                    <div className="mt-6 text-center">
                      <a 
                        href="https://app.supademo.com/demo/cm7nekm3o02rwi0nh5jwc9bvt" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-[#009688] hover:underline"
                      >
                        View Full Demo on Supademo
                        <MdChevronRight className="ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'search-properties' && (
              <div>
                <h1 className="text-4xl font-bold mb-8 text-slate-800 dark:text-white">
                  How to Search for Properties
                </h1>
                
                <div className="space-y-8">
                  <div className="bg-white dark:bg-dark-secondary shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">
                      Property Search Process
                    </h2>
                    <div className="w-full aspect-video">
                      <iframe 
                        src="https://app.supademo.com/embed/cm7nfntq203cki0nhib4rw3gg?embed_v=2" 
                        loading="lazy" 
                        title="Supademo Demo" 
                        allow="clipboard-write" 
                        frameBorder="0" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true" 
                        allowFullScreen 
                        className="w-full h-full rounded-lg shadow-md"
                      ></iframe>
                    </div>
                    <div className="mt-6 text-center">
                      <a 
                        href="https://app.supademo.com/demo/cm7nfntq203cki0nhib4rw3gg" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-[#009688] hover:underline"
                      >
                        View Full Demo on Supademo
                        <MdChevronRight className="ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'rating-verification' && (
              <div>
                <h1 className="text-4xl font-bold mb-8 text-slate-800 dark:text-white">
                  Where Can I Find My Rating Verification Code
                </h1>
                
                <div className="space-y-8">
                  <div className="bg-white dark:bg-dark-secondary shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">
                      Rating Verification Code Process
                    </h2>
                    <div className="w-full aspect-video">
                      <iframe 
                        src="https://app.supademo.com/embed/cm7nk1qlp07xbi0nh9dpjnxgh?embed_v=2" 
                        loading="lazy" 
                        title="Supademo Demo" 
                        allow="clipboard-write" 
                        frameBorder="0" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true" 
                        allowFullScreen 
                        className="w-full h-full rounded-lg shadow-md"
                      ></iframe>
                    </div>
                    <div className="mt-6 text-center">
                      <a 
                        href="https://app.supademo.com/demo/cm7nk1qlp07xbi0nh9dpjnxgh" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-[#009688] hover:underline"
                      >
                        View Full Demo on Supademo
                        <MdChevronRight className="ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'rate-user' && (
              <div>
                <h1 className="text-4xl font-bold mb-8 text-slate-800 dark:text-white">
                  How Can I Rate a User
                </h1>
                
                <div className="space-y-8">
                  <div className="bg-white dark:bg-dark-secondary shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">
                      User Rating Process
                    </h2>
                    <div className="w-full aspect-video">
                      <iframe 
                        src="https://app.supademo.com/embed/cm7nkv8rp08f8i0nh1gzielqe?embed_v=2" 
                        loading="lazy" 
                        title="Supademo Demo" 
                        allow="clipboard-write" 
                        frameBorder="0" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true" 
                        allowFullScreen 
                        className="w-full h-full rounded-lg shadow-md"
                      ></iframe>
                    </div>
                    <div className="mt-6 text-center">
                      <a 
                        href="https://app.supademo.com/demo/cm7nkv8rp08f8i0nh1gzielqe" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-[#009688] hover:underline"
                      >
                        View Full Demo on Supademo
                        <MdChevronRight className="ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
