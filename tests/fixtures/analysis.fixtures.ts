export const analysisFixtures = {
  theologicalAnalysis: {
    book: 'Genesis',
    chapter: 1,
    verses: '1-3',
    type: 'theological',
    content: {
      summary: 'The creation narrative establishes God as the sovereign creator of all existence.',
      themes: ['Creation', 'Divine Sovereignty', 'Order from Chaos'],
      keyInsights: [
        'God exists before creation',
        'Creation is intentional and purposeful',
        'Light represents divine order'
      ],
      crossReferences: [
        { verse: 'John 1:1-3', relationship: 'parallel' },
        { verse: 'Hebrews 11:3', relationship: 'commentary' }
      ],
      confidence: 0.92
    }
  },

  historicalAnalysis: {
    book: 'Exodus',
    chapter: 14,
    verses: '21-22',
    type: 'historical',
    content: {
      summary: 'The parting of the Red Sea represents a pivotal moment in Israelite history.',
      historicalContext: {
        period: '13th century BCE',
        location: 'Red Sea or Sea of Reeds',
        culturalBackground: 'Egyptian New Kingdom period'
      },
      archaeologicalEvidence: [
        'Chariot wheels found in the Red Sea',
        'Egyptian records of foreign slaves'
      ],
      scholarlyViews: [
        'Natural phenomenon enhanced by divine timing',
        'Miraculous supernatural intervention'
      ],
      confidence: 0.85
    }
  },

  symbolicAnalysis: {
    book: 'Revelation',
    chapter: 12,
    verses: '1-6',
    type: 'symbolic',
    content: {
      summary: 'The woman clothed with the sun represents multiple symbolic interpretations.',
      symbols: [
        {
          symbol: 'Woman',
          meanings: ['Israel', 'Church', 'Mary'],
          confidence: 0.88
        },
        {
          symbol: 'Dragon',
          meanings: ['Satan', 'Rome', 'Evil powers'],
          confidence: 0.95
        },
        {
          symbol: 'Crown of 12 stars',
          meanings: ['12 tribes', '12 apostles'],
          confidence: 0.90
        }
      ],
      interpretations: {
        preterist: 'First century persecution of the church',
        futurist: 'End times conflict',
        idealist: 'Ongoing spiritual warfare'
      },
      confidence: 0.87
    }
  },

  comprehensiveAnalysis: {
    book: 'John',
    chapter: 3,
    verses: '16',
    type: 'comprehensive',
    content: {
      theological: {
        themes: ['Divine Love', 'Salvation', 'Faith', 'Eternal Life'],
        doctrine: 'Soteriology - the doctrine of salvation'
      },
      historical: {
        context: 'Conversation with Nicodemus, a Pharisee',
        period: 'Around 30 AD',
        location: 'Jerusalem'
      },
      symbolic: {
        symbols: [
          { symbol: 'World', meaning: 'All humanity' },
          { symbol: 'Only Son', meaning: 'Unique divine relationship' }
        ]
      },
      linguistic: {
        originalLanguage: 'Greek',
        keyWords: [
          { word: 'agapao', translation: 'loved', significance: 'Divine unconditional love' },
          { word: 'kosmos', translation: 'world', significance: 'Created order and humanity' }
        ]
      },
      practical: {
        application: 'God\'s love is universal and salvation is available to all who believe',
        relevance: 'Central to Christian faith and evangelism'
      },
      confidence: 0.98
    }
  },

  errorAnalysis: {
    error: {
      code: 'ANALYSIS_FAILED',
      message: 'Unable to generate analysis',
      details: 'OpenAI API rate limit exceeded',
      timestamp: new Date().toISOString()
    }
  },

  cachedAnalysis: {
    book: 'Psalms',
    chapter: 23,
    verses: '1-6',
    type: 'theological',
    content: {
      summary: 'The Lord as shepherd provides and protects.',
      cached: true,
      cacheTimestamp: new Date().toISOString(),
      ttl: 3600
    }
  },

  multiVerseAnalysis: {
    book: 'Matthew',
    chapter: 5,
    verses: '3-12',
    type: 'theological',
    content: {
      summary: 'The Beatitudes present the characteristics of kingdom citizens.',
      sections: [
        { verse: '3', content: 'Blessed are the poor in spirit' },
        { verse: '4', content: 'Blessed are those who mourn' },
        { verse: '5', content: 'Blessed are the meek' },
        { verse: '6', content: 'Blessed are those who hunger and thirst for righteousness' },
        { verse: '7', content: 'Blessed are the merciful' },
        { verse: '8', content: 'Blessed are the pure in heart' },
        { verse: '9', content: 'Blessed are the peacemakers' },
        { verse: '10', content: 'Blessed are those persecuted for righteousness' }
      ],
      themes: ['Kingdom Ethics', 'Blessedness', 'Counter-cultural Values'],
      confidence: 0.94
    }
  }
};

export const generateAnalysisFixture = (overrides = {}) => {
  return {
    id: 'analysis-123',
    userId: 'user-456',
    ...analysisFixtures.theologicalAnalysis,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
};