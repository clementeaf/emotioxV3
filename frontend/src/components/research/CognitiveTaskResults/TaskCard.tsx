'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { CognitiveTaskResult, ScatterDataPoint } from './types';

interface TaskCardProps {
  task: CognitiveTaskResult;
  scatterData?: ScatterDataPoint[];
}

export function TaskCard({ task, scatterData }: TaskCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-neutral-200 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">{task.id}. {task.taskName}</h3>
          <p className="text-sm text-neutral-600 mt-1">{task.taskDescription}</p>
        </div>
        
        <div className="flex items-center space-x-3 text-xs">
          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded">
            {task.completed}/{task.totalParticipants} completado
          </span>
          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">
            Tiempo promedio: {task.averageTime}
          </span>
          <button 
            className="inline-flex items-center px-2 py-1 border border-neutral-300 shadow-sm text-xs font-medium rounded text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-1">Exportar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-6">
        {/* Puntuación principal */}
        <div className="col-span-2 flex flex-col">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#eaeaea" 
                strokeWidth="10" 
              />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke={task.score >= 80 ? '#4CAF50' : task.score >= 60 ? '#2196F3' : '#F44336'} 
                strokeWidth="10" 
                strokeDasharray={`${task.score * 2.83} ${283 - (task.score * 2.83)}`} 
                strokeDashoffset="0" 
                transform="rotate(-90 50 50)" 
              />
              <text 
                x="50" 
                y="50" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontSize="24" 
                fontWeight="bold" 
                fill={task.score >= 80 ? '#4CAF50' : task.score >= 60 ? '#2196F3' : '#F44336'}
              >
                {task.score}
              </text>
              <text 
                x="50" 
                y="70" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontSize="12" 
                fill="#666"
              >
                de {task.maxScore}
              </text>
            </svg>
          </div>
          
          <div className="mt-4 text-sm text-neutral-700 text-center">
            <div className="flex items-center justify-center">
              <span className="text-green-500 mr-1">▲</span>
              <span>+3.2% vs grupo control</span>
            </div>
          </div>
        </div>
        
        {/* Subtareas y barras de progreso */}
        <div className="col-span-3">
          <h4 className="text-sm font-medium text-neutral-700 mb-3">Rendimiento por subtarea</h4>
          {task.subtasks?.map((subtask, index) => (
            <div key={index} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-neutral-700">{subtask.name}</span>
                <span className="text-sm font-medium text-neutral-700">{subtask.score}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div 
                  className={cn(
                    'h-2.5 rounded-full', 
                    subtask.percentage >= 80 ? 'bg-green-500' : 
                      subtask.percentage >= 60 ? 'bg-blue-500' : 
                        'bg-amber-500'
                  )}
                  style={{ width: `${subtask.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Visualización de resultados o heatmap */}
        <div className="col-span-2">
          {task.heatmapUrl ? (
            <div className="rounded-lg overflow-hidden h-full flex flex-col">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">Patrón de respuesta</h4>
              <div className="bg-neutral-100 rounded-lg h-full min-h-[150px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50 opacity-50"></div>
                <div className="relative z-10 p-2">
                  <div className="bg-white/80 backdrop-blur-sm p-1 rounded-md text-xs text-center">
                    Vista previa de mapa de calor
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden h-full flex flex-col">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">Distribución de respuestas</h4>
              <div className="bg-neutral-100 rounded-lg h-full min-h-[150px] flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 relative">
                    {/* Simulación simple de gráfico de dispersión */}
                    {scatterData && scatterData.slice(0, 40).map((point, i) => (
                      <div 
                        key={i}
                        className={cn(
                          'absolute rounded-full w-1.5 h-1.5', 
                          point.cluster === 0 ? 'bg-blue-500' : 
                            point.cluster === 1 ? 'bg-purple-500' : 
                              'bg-green-500'
                        )}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          opacity: 0.7 + (Math.random() * 0.3)
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="relative z-10 p-2">
                  <div className="bg-white/80 backdrop-blur-sm p-1 rounded-md text-xs text-center">
                    Simulación de dispersión
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 