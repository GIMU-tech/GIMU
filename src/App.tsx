import React, { useState } from 'react';
import { StatusFeedback } from './components/ui/StatusFeedback';

/**
 * 개발 프로토타입: 디자인 명세 테스트를 위한 메인 앱
 */
const App = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  const testStatus = (s: any) => setStatus(s);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-12">AI IDE: Status Feedback Test</h1>
      
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-2xl mb-8">
        <StatusFeedback status={status} message={status === 'error' ? 'Connection Lost' : ''} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => testStatus('loading')} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition">Test Loading</button>
        <button onClick={() => testStatus('error')} className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 transition">Test Error</button>
        <button onClick={() => testStatus('success')} className="px도-4 py-2 bg-green-600 rounded hover:bg-green-500 transition">Test Success</button>
        <button onClick={() => testStatus('idle')} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 transition">Reset</button>
      </div>
    </div>
  );
};

export default App;