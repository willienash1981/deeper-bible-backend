export interface HistoricalContextEntry {
  period: string;
  description: string;
  key_events: string[];
  cultural_norms: string[];
  geographical_relevance: string[];
}

export const HISTORICAL_CONTEXTS: { [key: string]: HistoricalContextEntry } = {
  'first_century_judea': {
    period: '1st Century CE Judea',
    description: 'The socio-political and religious landscape during the time of Jesus and the early church.',
    key_events: ['Roman occupation', 'Herodian dynasty', 'Jewish revolts', 'Destruction of the Temple'],
    cultural_norms: ['Honor-shame culture', 'Patriarchal society', 'Slavery', 'Religious sects (Pharisees, Sadducees, Essenes)'],
    geographical_relevance: ['Jerusalem', 'Galilee', 'Samaria', 'Dead Sea'],
  },
  'exodus_period': {
    period: 'Ancient Egypt & Sinai (Bronze Age)',
    description: 'The period of Israel\'s enslavement in Egypt and their subsequent exodus and wilderness wanderings.', // Corrected: Israel\'s
    key_events: ['Enslavement in Egypt', 'Ten Plagues', 'Crossing of the Red Sea', 'Receiving the Law at Sinai'],
    cultural_norms: ['Polytheistic Egyptian religion', 'Pharaoh as divine ruler', 'Nomadic tribal life in wilderness'],
    geographical_relevance: ['Nile River', 'Sinai Peninsula', 'Mount Sinai', 'Canaan'],
  },
  // Add more historical contexts as needed
};