'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const WorkoutAnalysis = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState([]);
  const [squashStats, setSquashStats] = useState({
    totalSessions: 0,
    totalDuration: '0h 0m',
    avgCalories: 0,
    maxHeartRate: 0
  });
  const [hikingStats, setHikingStats] = useState({
    totalSessions: 0,
    totalDuration: '0h 0m',
    avgCalories: 0,
    maxHeartRate: 0
  });

  const exportAsImage = async () => {
    if (!containerRef.current) return;
    try {
      const element = containerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('export-container');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
            clonedElement.style.height = 'auto';
          }
        }
      });

      const link = document.createElement('a');
      link.download = `workout-analysis-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/workouts.csv');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();
        const parseResult = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });

        const processedData = parseResult.data
          .filter(row => row['Workout Type'] === 'Squash' || row['Workout Type'] === 'Hiking')
          .map(row => {
            const durationParts = row['Duration'].split(':');
            const minutes = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
            return {
              date: new Date(row['Start']).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              duration: row['Duration'],
              durationMinutes: minutes,
              calories: row['Active Energy (kcal)'],
              avgHeartRate: row['Avg. Heart Rate (bpm)'],
              maxHeartRate: row['Max. Heart Rate (bpm)'],
              workoutType: row['Workout Type']
            };
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(processedData);

        const squashData = processedData.filter(row => row.workoutType === 'Squash');
        if (squashData.length > 0) {
          const totalMinutes = squashData.reduce((acc, row) => acc + row.durationMinutes, 0);
          setSquashStats({
            totalSessions: squashData.length,
            totalDuration: formatDuration(totalMinutes),
            avgCalories: Math.round(squashData.reduce((acc, row) => acc + row.calories, 0) / squashData.length),
            maxHeartRate: Math.max(...squashData.map(row => row.maxHeartRate || 0))
          });
        }

        const hikingData = processedData.filter(row => row.workoutType === 'Hiking');
        if (hikingData.length > 0) {
          const totalMinutes = hikingData.reduce((acc, row) => acc + row.durationMinutes, 0);
          setHikingStats({
            totalSessions: hikingData.length,
            totalDuration: formatDuration(totalMinutes),
            avgCalories: Math.round(hikingData.reduce((acc, row) => acc + row.calories, 0) / hikingData.length),
            maxHeartRate: Math.max(...hikingData.map(row => row.maxHeartRate || 0))
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    fetchData();
  }, []);

  const StatsRow = ({ label, value }) => (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );

  return (
    <div ref={containerRef} id="export-container" className="bg-white p-8 w-full min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-16">
        <h1 className="text-7xl font-bold">WORKOUT<br/>ANALYSIS</h1>
        <button
          onClick={exportAsImage}
          className="bg-black text-white px-4 py-2 text-xs tracking-wider"
        >
          EXPORT ANALYSIS
        </button>
      </div>

      {/* Squash Section */}
      <div className="mb-24">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="text-5xl font-bold">SQUASH</h2>
          <div className="flex-1 h-px bg-black"></div>
        </div>

        <div className="space-y-12">
          {/* Total Duration */}
          <div className="bg-gray-50 p-8">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Total Duration</div>
            <div className="text-6xl font-bold">{squashStats.totalDuration}</div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-16">
            <StatsRow label="Max Heart Rate" value={`${squashStats.maxHeartRate}bpm`} />
            <StatsRow label="Total Sessions" value={squashStats.totalSessions} />
            <StatsRow label="Avg Calories" value={`${squashStats.avgCalories}kcal`} />
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.filter(d => d.workoutType === 'Squash')} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" stroke="#000" fontSize={12} />
                <YAxis stroke="#000" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #000',
                    borderRadius: '0px',
                    fontSize: '12px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#000" 
                  strokeWidth={2}
                  dot={false}
                  name="Calories" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hiking Section */}
      <div className="bg-black text-white p-8">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="text-5xl font-bold">HIKING</h2>
          <div className="flex-1 h-px bg-white"></div>
        </div>

        <div className="space-y-12">
          {/* Total Duration */}
          <div className="bg-gray-900 p-8">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Duration</div>
            <div className="text-6xl font-bold">{hikingStats.totalDuration}</div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-16">
            <StatsRow label="Max Heart Rate" value={`${hikingStats.maxHeartRate}bpm`} />
            <StatsRow label="Total Sessions" value={hikingStats.totalSessions} />
            <StatsRow label="Avg Calories" value={`${hikingStats.avgCalories}kcal`} />
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.filter(d => d.workoutType === 'Hiking')} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#fff" fontSize={12} />
                <YAxis stroke="#fff" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000',
                    border: '1px solid #fff',
                    borderRadius: '0px',
                    fontSize: '12px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#88ff00" 
                  strokeWidth={2}
                  dot={false}
                  name="Calories" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutAnalysis;