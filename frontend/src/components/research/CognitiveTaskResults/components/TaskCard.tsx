'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { CognitiveTaskResult } from '../types';

interface TaskCardProps {
  task: CognitiveTaskResult;
  className?: string;
}

export function TaskCard({ task, className }: TaskCardProps) {
  const { 
    id, 
    taskName, 
    taskDescription, 
    completed, 
    totalParticipants, 
    score, 
    maxScore, 
    averageTime, 
    subtasks, 
    trendVsControl 
  } = task;
  
  // Determinar el color del círculo de progreso según la puntuación
  const getScoreColor = () => {
    if (score >= 80) {return '#4CAF50';} // Verde para puntuación alta
    if (score >= 60) {return '#2196F3';} // Azul para puntuación media
    return '#F44336'; // Rojo para puntuación baja
  };
  
  // Calcular el porcentaje de la circunferencia para el círculo de progreso
  const circumference = 2 * Math.PI * 45; // 2πr, donde r = 45
  const strokeDasharray = `${(score / maxScore) * circumference} ${circumference}`;
  
  return (
    <div className={cn('bg-white p-6 rounded-lg border border-neutral-200', className)}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">{id}. {taskName}</h3>
          <p className="text-sm text-neutral-600 mt-1">{taskDescription}</p>
        </div>
        
        <div className="flex items-center space-x-3 text-xs">
          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded">
            {completed}/{totalParticipants} completado
          </span>
          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">
            Tiempo promedio: {averageTime}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-6">
        {/* Puntuación principal */}
        <div className="col-span-2 flex flex-col items-center">
          <div className="relative w-32 h-32">
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
                stroke={getScoreColor()} 
                strokeWidth="10" 
                strokeDasharray={strokeDasharray} 
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
                fill={getScoreColor()}
              >
                {score}
              </text>
              <text 
                x="50" 
                y="70" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontSize="12" 
                fill="#666"
              >
                de {maxScore}
              </text>
            </svg>
          </div>
          
          {trendVsControl !== undefined && (
            <div className="mt-4 text-sm text-neutral-700 text-center">
              <div className="flex items-center justify-center">
                {trendVsControl >= 0 ? (
                  <>
                    <span className="text-green-500 mr-1">▲</span>
                    <span>+{trendVsControl.toFixed(1)}% vs grupo control</span>
                  </>
                ) : (
                  <>
                    <span className="text-red-500 mr-1">▼</span>
                    <span>{trendVsControl.toFixed(1)}% vs grupo control</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Subtareas y barras de progreso */}
        <div className="col-span-5">
          {subtasks && subtasks.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Rendimiento por subtarea</h4>
              <div className="space-y-3">
                {subtasks.map((subtask, index) => (
                  <div key={index}>
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500 text-sm">No hay subtareas disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 