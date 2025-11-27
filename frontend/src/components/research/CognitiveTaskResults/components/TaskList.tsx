'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { CognitiveTaskResult } from '../types';

import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: CognitiveTaskResult[];
  className?: string;
}

export function TaskList({ tasks, className }: TaskListProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className={cn('bg-white p-6 rounded-lg border border-neutral-200 text-center', className)}>
        <p className="text-neutral-600">No hay tareas cognitivas disponibles.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
        />
      ))}
    </div>
  );
} 