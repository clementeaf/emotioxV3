'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface RatingData {
  question: string;
  description?: string;
  ratingType: 'stars' | 'numbers' | 'emojis';
  responses: { rating: number; count: number }[];
  averageRating: number;
  totalResponses: number;
  maxRating: number;
  responseTime?: string;
  satisfactionLevel?: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';
}

interface RatingResultsProps {
  data: RatingData;
}

export function RatingResults({ data }: RatingResultsProps) {
  const {
    question,
    description,
    ratingType,
    responses,
    averageRating,
    totalResponses,
    maxRating,
    responseTime,
    satisfactionLevel
  } = data;

  // Preparar datos para gráficos
  const barChartData = responses.map(item => ({
    rating: item.rating,
    count: item.count,
    percentage: Math.round((item.count / totalResponses) * 100)
  }));

  const pieChartData = responses.map(item => ({
    name: `${item.rating} ${ratingType === 'stars' ? '⭐' : ratingType === 'emojis' ? '😊' : ''}`,
    value: item.count,
    percentage: Math.round((item.count / totalResponses) * 100)
  }));

  // Colores para el gráfico de pie
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Función para renderizar estrellas
  const renderStars = (rating: number) => {
    return Array.from({ length: maxRating }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  // Función para renderizar emojis
  const renderEmojis = (rating: number) => {
    const emojis = ['😞', '😐', '🙂', '😊', '😍'];
    return emojis[rating - 1] || '😐';
  };

  // Función para renderizar números
  const renderNumbers = (rating: number) => {
    return rating.toString();
  };

  const renderRating = (rating: number) => {
    switch (ratingType) {
      case 'stars':
        return renderStars(rating);
      case 'emojis':
        return renderEmojis(rating);
      case 'numbers':
        return renderNumbers(rating);
      default:
        return rating.toString();
    }
  };

  // Calcular nivel de satisfacción
  const getSatisfactionText = () => {
    if (averageRating >= maxRating * 0.8) return 'Muy Satisfecho';
    if (averageRating >= maxRating * 0.6) return 'Satisfecho';
    if (averageRating >= maxRating * 0.4) return 'Neutral';
    if (averageRating >= maxRating * 0.2) return 'Insatisfecho';
    return 'Muy Insatisfecho';
  };

  return (
    <div className="p-6">
      {/* Información de la pregunta */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{averageRating.toFixed(1)}</div>
            <div className="text-sm text-yellow-600">Promedio</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalResponses}</div>
            <div className="text-sm text-green-600">Respuestas</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{maxRating}</div>
            <div className="text-sm text-blue-600">Máximo</div>
          </div>
          {responseTime && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{responseTime}</div>
              <div className="text-sm text-orange-600">Tiempo promedio</div>
            </div>
          )}
        </div>

        {/* Nivel de satisfacción */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-md font-semibold text-gray-800 mb-2">Nivel de Satisfacción</h4>
          <div className="flex items-center space-x-4">
            <div className="text-3xl">
              {ratingType === 'stars' ? renderStars(Math.round(averageRating)) :
                ratingType === 'emojis' ? renderEmojis(Math.round(averageRating)) :
                  averageRating.toFixed(1)}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{getSatisfactionText()}</div>
              <div className="text-sm text-gray-600">Basado en {totalResponses} respuestas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de barras */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-4">Distribución de Calificaciones</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="rating"
                  label={{ value: 'Calificación', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Número de Respuestas', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} respuestas (${Math.round((value / totalResponses) * 100)}%)`,
                    'Respuestas'
                  ]}
                  labelFormatter={(label) => `Calificación: ${label}`}
                />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pie */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-4">Distribución Porcentual</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de respuestas detalladas */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-4">Detalle de Calificaciones</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calificación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualización
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Respuestas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Porcentaje
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barra
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {barChartData.map((item) => (
                <tr key={item.rating} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.rating}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="text-lg">{renderRating(item.rating)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.percentage}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Análisis de satisfacción */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-2">Análisis de Satisfacción</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Calificación promedio:</strong> {averageRating.toFixed(1)} de {maxRating}</p>
          <p>• <strong>Nivel de satisfacción:</strong> {getSatisfactionText()}</p>
          <p>• <strong>Calificación más frecuente:</strong> {barChartData.find(item => item.count === Math.max(...barChartData.map(d => d.count)))?.rating}</p>
          <p>• <strong>Distribución:</strong> {averageRating > maxRating / 2 ? 'Tendencia positiva' : 'Tendencia negativa'}</p>
        </div>
      </div>
    </div>
  );
}
