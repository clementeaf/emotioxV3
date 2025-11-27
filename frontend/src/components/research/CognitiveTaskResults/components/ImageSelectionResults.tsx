'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ImageSelectionData {
  question: string;
  description?: string;
  images: {
    id: string;
    name: string;
    imageUrl: string;
    selected: number;
    percentage: number;
    category?: string;
  }[];
  totalSelections: number;
  totalParticipants: number;
  responseTime?: string;
  selectionAnalysis?: string;
  mostSelected?: string;
  leastSelected?: string;
  categories?: { name: string; count: number }[];
}

interface ImageSelectionResultsProps {
  data: ImageSelectionData;
}

export function ImageSelectionResults({ data }: ImageSelectionResultsProps) {
  const {
    question,
    description,
    images,
    totalSelections,
    totalParticipants,
    responseTime,
    selectionAnalysis,
    categories
  } = data;

  // Preparar datos para gráficos
  const barChartData = images.map(img => ({
    name: img.name,
    selections: img.selected,
    percentage: img.percentage,
    category: img.category
  }));

  const pieChartData = images.map(img => ({
    name: img.name,
    value: img.selected,
    percentage: img.percentage,
    category: img.category
  }));

  // Colores para el gráfico de pie
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  // Encontrar imágenes más y menos seleccionadas
  const sortedImages = [...images].sort((a, b) => b.selected - a.selected);
  const topSelected = sortedImages[0];
  const leastSelected = sortedImages[sortedImages.length - 1];

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
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{totalSelections}</div>
            <div className="text-sm text-indigo-600">Selecciones</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalParticipants}</div>
            <div className="text-sm text-green-600">Participantes</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{images.length}</div>
            <div className="text-sm text-blue-600">Imágenes</div>
          </div>
          {responseTime && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{responseTime}</div>
              <div className="text-sm text-orange-600">Tiempo promedio</div>
            </div>
          )}
        </div>

        {/* Imagen más seleccionada */}
        {topSelected && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-md font-semibold text-green-800 mb-2">Imagen Más Seleccionada</h4>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-green-200">
                <img
                  src={topSelected.imageUrl}
                  alt={topSelected.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-lg font-semibold text-green-900">{topSelected.name}</div>
                <div className="text-sm text-green-700">
                  {topSelected.selected} selecciones ({topSelected.percentage}%)
                </div>
                {topSelected.category && (
                  <div className="text-xs text-green-600">Categoría: {topSelected.category}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de barras */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-4">Distribución de Selecciones</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  label={{ value: 'Imágenes', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Número de Selecciones', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} selecciones (${Math.round((value / totalSelections) * 100)}%)`,
                    'Selecciones'
                  ]}
                  labelFormatter={(label) => `Imagen: ${label}`}
                />
                <Bar dataKey="selections" fill="#6366F1" radius={[4, 4, 0, 0]} />
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

      {/* Galería de imágenes con estadísticas */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-4">Galería de Imágenes</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 mb-3">
                <img
                  src={image.imageUrl}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">{image.name}</div>
              <div className="text-xs text-gray-600">{image.selected} selecciones</div>
              <div className="text-xs text-indigo-600 font-medium">{image.percentage}%</div>
              {image.category && (
                <div className="text-xs text-gray-500 mt-1">Categoría: {image.category}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de imágenes detalladas */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-4">Detalle de Selecciones</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imagen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selecciones
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
              {images.map((image) => (
                <tr key={image.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border">
                      <img
                        src={image.imageUrl}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {image.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {image.category || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {image.selected}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {image.percentage}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${image.percentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Análisis de selecciones */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-2">Análisis de Selecciones</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Imagen más seleccionada:</strong> {topSelected?.name} ({topSelected?.percentage}%)</p>
          <p>• <strong>Imagen menos seleccionada:</strong> {leastSelected?.name} ({leastSelected?.percentage}%)</p>
          <p>• <strong>Total de selecciones:</strong> {totalSelections}</p>
          <p>• <strong>Participantes:</strong> {totalParticipants}</p>
          {selectionAnalysis && (
            <p>• <strong>Análisis:</strong> {selectionAnalysis}</p>
          )}
        </div>
      </div>

      {/* Análisis por categorías */}
      {categories && categories.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Análisis por Categorías</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.name} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-lg font-semibold text-gray-900">{category.name}</div>
                <div className="text-2xl font-bold text-indigo-600">{category.count}</div>
                <div className="text-sm text-gray-600">selecciones</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
