/**
 * Interfaz base para participantes
 */
export interface Participant {
  id?: string;
  name: string;
  email: string;
  token?: string;
}
