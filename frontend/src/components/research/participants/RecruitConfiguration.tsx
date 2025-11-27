'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField, FormSection, FormCard, FormRow } from '@/components/common/atomic';
import { QRCodeModal } from '../shared/QRCodeModal';

interface RecruitConfigurationProps {
  className?: string;
}

interface DemographicConfig {
  age: boolean;
  country: boolean;
  gender: boolean;
  educationLevel: boolean;
  annualIncome: boolean;
  employmentStatus: boolean;
  dailyHoursOnline: boolean;
  technicalProficiency: boolean;
}

interface LinkConfig {
  completeInterviews: string;
  disqualifiedInterviews: string;
  overquotaInterviews: string;
}

interface ResearchConfig {
  researchUrl: string;
  participantLimit: number;
}

interface Statistics {
  complete: number;
  disqualified: number;
  overquota: number;
}

/**
 * Componente refactorizado que usa componentes atómicos
 * Elimina duplicación de layouts y patrones repetidos
 */
export function RecruitConfiguration({ className }: RecruitConfigurationProps) {
  const [demographicEnabled, setDemographicEnabled] = useState(true);
  const [linkConfigEnabled, setLinkConfigEnabled] = useState(true);
  const [limitParticipantsEnabled, setLimitParticipantsEnabled] = useState(true);
  const [allowMobileDevices, setAllowMobileDevices] = useState(true);
  const [trackLocation, setTrackLocation] = useState(true);
  const [participantLimit, setParticipantLimit] = useState(50);
  const [showQRCode, setShowQRCode] = useState(false);

  const [demographicConfig, setDemographicConfig] = useState<DemographicConfig>({
    age: true,
    country: true,
    gender: true,
    educationLevel: true,
    annualIncome: true,
    employmentStatus: true,
    dailyHoursOnline: true,
    technicalProficiency: true,
  });

  const [linkConfig, setLinkConfig] = useState<LinkConfig>({
    completeInterviews: '',
    disqualifiedInterviews: '',
    overquotaInterviews: '',
  });

  const [researchConfig, setResearchConfig] = useState<ResearchConfig>({
    researchUrl: 'https://research.emotiox.com/demo',
    participantLimit: 50,
  });

  const [statistics] = useState<Statistics>({
    complete: 12,
    disqualified: 3,
    overquota: 1,
  });

  return (
    <div className={className}>
      <FormCard>
        <FormSection 
          title="Configuración de Reclutamiento"
          description="Configure los parámetros de reclutamiento de participantes"
        >
          {/* Configuración de Demografía */}
          <FormSection 
            title="Configuración Demográfica"
            description="Seleccione qué datos demográficos recopilar"
            collapsible={true}
            collapsed={false}
          >
            <FormField
              type="toggle"
              label="Habilitar recopilación demográfica"
              value={demographicEnabled}
              onChange={setDemographicEnabled}
            />

            {demographicEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="toggle"
                  label="Edad"
                  value={demographicConfig.age}
                  onChange={(value) => setDemographicConfig(prev => ({ ...prev, age: value }))}
                />
                <FormField
                  type="toggle"
                  label="País"
                  value={demographicConfig.country}
                  onChange={(value) => setDemographicConfig(prev => ({ ...prev, country: value }))}
                />
                <FormField
                  type="toggle"
                  label="Género"
                  value={demographicConfig.gender}
                  onChange={(value) => setDemographicConfig(prev => ({ ...prev, gender: value }))}
                />
                <FormField
                  type="toggle"
                  label="Nivel educativo"
                  value={demographicConfig.educationLevel}
                  onChange={(value) => setDemographicConfig(prev => ({ ...prev, educationLevel: value }))}
                />
              </div>
            )}
          </FormSection>

          {/* Configuración de Enlaces */}
          <FormSection 
            title="Configuración de Enlaces"
            description="Configure los enlaces de redirección"
            collapsible={true}
            collapsed={false}
          >
            <FormField
              type="toggle"
              label="Habilitar configuración de enlaces"
              value={linkConfigEnabled}
              onChange={setLinkConfigEnabled}
            />

            {linkConfigEnabled && (
              <div className="space-y-4">
                <FormField
                  type="text"
                  label="Enlace para entrevistas completadas"
                  value={linkConfig.completeInterviews}
                  onChange={(value) => setLinkConfig(prev => ({ ...prev, completeInterviews: value }))}
                  placeholder="https://d1m54jkfd0fdui.cloudfront.net/completed"
                />
                <FormField
                  type="text"
                  label="Enlace para entrevistas descalificadas"
                  value={linkConfig.disqualifiedInterviews}
                  onChange={(value) => setLinkConfig(prev => ({ ...prev, disqualifiedInterviews: value }))}
                  placeholder="https://d1m54jkfd0fdui.cloudfront.net/disqualified"
                />
                <FormField
                  type="text"
                  label="Enlace para entrevistas sobre cuota"
                  value={linkConfig.overquotaInterviews}
                  onChange={(value) => setLinkConfig(prev => ({ ...prev, overquotaInterviews: value }))}
                  placeholder="https://d1m54jkfd0fdui.cloudfront.net/exceeded"
                />
              </div>
            )}
          </FormSection>

          {/* Configuración de Límites */}
          <FormSection 
            title="Configuración de Límites"
            description="Configure los límites de participantes"
            collapsible={true}
            collapsed={false}
          >
            <FormField
              type="toggle"
              label="Limitar número de participantes"
              value={limitParticipantsEnabled}
              onChange={setLimitParticipantsEnabled}
            />

            {limitParticipantsEnabled && (
              <FormField
                type="number"
                label="Límite de participantes"
                value={participantLimit}
                onChange={(value) => setParticipantLimit(parseInt(value) || 0)}
                config={{ min: 1, max: 1000 }}
              />
            )}
          </FormSection>

          {/* Configuración de Dispositivos */}
          <FormSection 
            title="Configuración de Dispositivos"
            description="Configure las opciones de dispositivos"
            collapsible={true}
            collapsed={false}
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                type="toggle"
                label="Permitir dispositivos móviles"
                value={allowMobileDevices}
                onChange={setAllowMobileDevices}
              />
              <FormField
                type="toggle"
                label="Rastrear ubicación"
                value={trackLocation}
                onChange={setTrackLocation}
              />
            </div>
          </FormSection>

          {/* Estadísticas */}
          <FormSection 
            title="Estadísticas"
            description="Estadísticas actuales de participantes"
            collapsible={true}
            collapsed={true}
          >
            <div className="grid grid-cols-3 gap-4">
              <FormCard className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.complete}</div>
                <div className="text-sm text-gray-600">Completadas</div>
              </FormCard>
              <FormCard className="text-center">
                <div className="text-2xl font-bold text-red-600">{statistics.disqualified}</div>
                <div className="text-sm text-gray-600">Descalificadas</div>
              </FormCard>
              <FormCard className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{statistics.overquota}</div>
                <div className="text-sm text-gray-600">Sobre cuota</div>
              </FormCard>
            </div>
          </FormSection>

          {/* Acciones */}
          <FormRow justified>
            <Button
              variant="outline"
              onClick={() => setShowQRCode(true)}
            >
              Ver Código QR
            </Button>
            <Button
              variant="default"
              onClick={() => console.log('Guardar configuración')}
            >
              Guardar Configuración
            </Button>
          </FormRow>
        </FormSection>
      </FormCard>

      {/* Modal de Código QR */}
      <QRCodeModal
        open={showQRCode}
        onOpenChange={setShowQRCode}
        researchUrl={researchConfig.researchUrl}
      />
    </div>
  );
}
