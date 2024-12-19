//generate a saas startup landing page
//use tailwind css

import React from "react";

const page = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">SaaS Startup</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96">
              <h2 className="text-2xl font-semibold text-center mt-10">
                Welcome to Our SaaS Solution
              </h2>
              <p className="mt-4 text-center text-gray-600">
                We provide the best tools to manage your business efficiently.
              </p>
              <div className="mt-8 flex justify-center">
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white shadow mt-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © 2023 SaaS Startup. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default page;
