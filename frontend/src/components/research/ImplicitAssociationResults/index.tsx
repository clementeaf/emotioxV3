'use client';

import React from 'react';
import { Filters } from '../SmartVOCResults/Filters';

interface ImplicitAssociationResultsProps {
  researchId: string;
}

export const ImplicitAssociationResults: React.FC<ImplicitAssociationResultsProps> = ({
  researchId
}) => {
  return (
    <div className="pt-4">
      {/* Implicit Association Section with sidebar layout */}
      <div className="flex gap-8">
        <div className="flex-1">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">3.0.- Implicit Association</h2>
            <p className="text-sm text-gray-600 mb-6">
              IAT - Reaction Time Test (Attribute Testing, RTTT)
            </p>
            <p className="text-sm text-gray-600 mb-8">
              Priming display time set in 400 ms
            </p>

            <div className="bg-white rounded-xl border p-8">
              <div className="flex justify-center">
                {/* Radar Chart Container */}
                <div className="relative w-96 h-96">
                  <svg viewBox="0 0 400 400" className="w-full h-full">
                    {/* Grid circles */}
                    <circle cx="200" cy="200" r="50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    <circle cx="200" cy="200" r="100" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    <circle cx="200" cy="200" r="150" fill="none" stroke="#e5e7eb" strokeWidth="1"/>

                    {/* Grid lines */}
                    {[
                      { angle: 0 }, { angle: 24 }, { angle: 48 }, { angle: 72 }, { angle: 96 },
                      { angle: 120 }, { angle: 144 }, { angle: 168 }, { angle: 192 }, { angle: 216 },
                      { angle: 240 }, { angle: 264 }, { angle: 288 }, { angle: 312 }, { angle: 336 }
                    ].map((point, i) => {
                      const radian = (point.angle * Math.PI) / 180;
                      const x1 = 200 + Math.cos(radian) * 50;
                      const y1 = 200 + Math.sin(radian) * 50;
                      const x2 = 200 + Math.cos(radian) * 150;
                      const y2 = 200 + Math.sin(radian) * 150;

                      return (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1"/>
                      );
                    })}

                    {/* Purple (blue) polygon */}
                    <polygon
                      points="200,80 280,120 320,180 340,220 320,280 260,320 200,330 160,320 120,280 100,220 120,180 160,120"
                      fill="#8b5cf6"
                      fillOpacity="0.3"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    />

                    {/* Green polygon */}
                    <polygon
                      points="200,100 250,140 290,200 310,240 290,290 250,320 200,310 170,300 140,260 130,200 150,160 180,130"
                      fill="#10b981"
                      fillOpacity="0.3"
                      stroke="#10b981"
                      strokeWidth="2"
                    />

                    {/* Points for purple polygon */}
                    {[
                      {x: 200, y: 80}, {x: 280, y: 120}, {x: 320, y: 180}, {x: 340, y: 220},
                      {x: 320, y: 280}, {x: 260, y: 320}, {x: 200, y: 330}, {x: 160, y: 320},
                      {x: 120, y: 280}, {x: 100, y: 220}, {x: 120, y: 180}, {x: 160, y: 120}
                    ].map((point, i) => (
                      <circle key={`purple-${i}`} cx={point.x} cy={point.y} r="4" fill="#8b5cf6"/>
                    ))}

                    {/* Points for green polygon */}
                    {[
                      {x: 200, y: 100}, {x: 250, y: 140}, {x: 290, y: 200}, {x: 310, y: 240},
                      {x: 290, y: 290}, {x: 250, y: 320}, {x: 200, y: 310}, {x: 170, y: 300},
                      {x: 140, y: 260}, {x: 130, y: 200}, {x: 150, y: 160}, {x: 180, y: 130}
                    ].map((point, i) => (
                      <circle key={`green-${i}`} cx={point.x} cy={point.y} r="4" fill="#10b981"/>
                    ))}

                    {/* Value labels on grid */}
                    <text x="200" y="155" textAnchor="middle" className="text-xs fill-gray-500">20</text>
                    <text x="200" y="105" textAnchor="middle" className="text-xs fill-gray-500">60</text>
                    <text x="200" y="55" textAnchor="middle" className="text-xs fill-gray-500">100</text>
                    <text x="200" y="205" textAnchor="middle" className="text-xs fill-gray-500">0</text>
                    <text x="200" y="255" textAnchor="middle" className="text-xs fill-gray-500">-60</text>

                    {/* Attribute labels */}
                    {[
                      { label: 'Atributo 1', x: 200, y: 35 },
                      { label: 'Atributo 2', x: 350, y: 80 },
                      { label: 'Atributo 3', x: 370, y: 160 },
                      { label: 'Atributo 4', x: 370, y: 240 },
                      { label: 'Atributo 5', x: 350, y: 320 },
                      { label: 'Atributo 6', x: 270, y: 380 },
                      { label: 'Atributo 7', x: 200, y: 390 },
                      { label: 'Atributo 8', x: 130, y: 380 },
                      { label: 'Atributo 9', x: 50, y: 350 },
                      { label: 'Atributo 10', x: 30, y: 270 },
                      { label: 'Atributo 11', x: 30, y: 190 },
                      { label: 'Atributo 12', x: 50, y: 110 },
                      { label: 'Atributo 13', x: 110, y: 50 },
                      { label: 'Atributo 14', x: 170, y: 35 },
                      { label: 'Atributo 15', x: 250, y: 50 }
                    ].map((point, i) => (
                      <text
                        key={i}
                        x={point.x}
                        y={point.y}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 font-medium"
                      >
                        {point.label}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters sidebar */}
        <div className="w-80 shrink-0 mt-[52px]">
          <Filters researchId={researchId} />
        </div>
      </div>
    </div>
  );
};