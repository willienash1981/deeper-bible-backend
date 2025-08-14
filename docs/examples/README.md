# API Examples

This directory contains working examples of how to integrate with the Deeper Bible API using various programming languages and tools.

## 📋 Table of Contents

- [Authentication Examples](#authentication-examples)
- [Analysis Examples](#analysis-examples)  
- [Symbol Detection Examples](#symbol-detection-examples)
- [Client Libraries](#client-libraries)
- [cURL Examples](#curl-examples)
- [Postman Collection](#postman-collection)

## Authentication Examples

### JavaScript/TypeScript

```typescript
// auth-client.ts
interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

class DeeperBibleAuth {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'https://api.deeperbible.com') {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    
    // Store token securely (example using localStorage)
    if (typeof window !== 'undefined') {
      localStorage.setItem('deeper_bible_token', data.token);
      localStorage.setItem('deeper_bible_refresh_token', data.refreshToken);
    }

    return data;
  }

  async register(email: string, password: string, name?: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.token = data.token;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('deeper_bible_token', data.token);
    }

    return data;
  }

  getAuthHeader(): Record<string, string> {
    if (!this.token) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    return {
      'Authorization': `Bearer ${this.token}`,
    };
  }
}

// Usage example
const auth = new DeeperBibleAuth();

try {
  const loginResult = await auth.login('user@example.com', 'password123');
  console.log('Login successful:', loginResult);
} catch (error) {
  console.error('Login error:', error);
}
```

### Python

```python
# auth_client.py
import requests
from typing import Dict, Optional
import json

class DeeperBibleAuth:
    def __init__(self, base_url: str = "https://api.deeperbible.com"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def login(self, email: str, password: str) -> Dict:
        """Authenticate user and store tokens"""
        url = f"{self.base_url}/api/auth/login"
        payload = {
            "email": email,
            "password": password
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        self.token = data['token']
        self.refresh_token = data.get('refreshToken')
        
        return data

    def register(self, email: str, password: str, name: str = None) -> Dict:
        """Register new user"""
        url = f"{self.base_url}/api/auth/register"
        payload = {
            "email": email,
            "password": password
        }
        if name:
            payload["name"] = name
            
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        return response.json()

    def refresh_access_token(self) -> str:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise ValueError("No refresh token available")
            
        url = f"{self.base_url}/api/auth/refresh"
        payload = {"refreshToken": self.refresh_token}
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        self.token = data['token']
        return self.token

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers for API requests"""
        if not self.token:
            raise ValueError("Not authenticated. Please login first.")
            
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

# Usage example
auth = DeeperBibleAuth()

try:
    login_result = auth.login("user@example.com", "password123")
    print(f"Login successful: {login_result}")
except requests.exceptions.RequestException as e:
    print(f"Login error: {e}")
```

## Analysis Examples

### Complete Analysis Workflow (TypeScript)

```typescript
// analysis-client.ts
interface AnalysisRequest {
  verse_range: string;
  translation?: string;
  analysis_type?: string[];
  denomination?: string;
  include_symbols?: boolean;
}

interface AnalysisResult {
  id: string;
  verse_range: string;
  translation: string;
  text: string;
  analysis: {
    theological?: any;
    historical?: any;
    symbolic?: any;
  };
  symbols?: any[];
  cross_references?: any[];
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
}

class DeeperBibleClient {
  constructor(
    private auth: DeeperBibleAuth,
    private baseUrl: string = 'https://api.deeperbible.com'
  ) {}

  async analyzeVerse(request: AnalysisRequest): Promise<AnalysisResult> {
    const response = await fetch(`${this.baseUrl}/api/analysis`, {
      method: 'POST',
      headers: {
        ...this.auth.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token and retry
        await this.auth.refreshToken(
          localStorage.getItem('deeper_bible_refresh_token') || ''
        );
        return this.analyzeVerse(request);
      }
      
      const error = await response.json();
      throw new Error(error.message || 'Analysis failed');
    }

    return response.json();
  }

  async getAnalysisHistory(page = 1, limit = 20) {
    const url = `${this.baseUrl}/api/analysis/history?page=${page}&limit=${limit}`;
    const response = await fetch(url, {
      headers: this.auth.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analysis history');
    }

    return response.json();
  }

  async detectSymbols(text: string, context?: string) {
    const response = await fetch(`${this.baseUrl}/api/symbols/detect`, {
      method: 'POST',
      headers: {
        ...this.auth.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, context }),
    });

    if (!response.ok) {
      throw new Error('Symbol detection failed');
    }

    return response.json();
  }

  async getSymbolRelationships(symbol: string) {
    const url = `${this.baseUrl}/api/symbols/relationships?symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(url, {
      headers: this.auth.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch symbol relationships');
    }

    return response.json();
  }
}

// Complete usage example
async function demonstrateAPI() {
  const auth = new DeeperBibleAuth();
  const client = new DeeperBibleClient(auth);

  try {
    // 1. Authenticate
    await auth.login('user@example.com', 'password123');
    console.log('✅ Authentication successful');

    // 2. Perform comprehensive analysis
    const analysisRequest: AnalysisRequest = {
      verse_range: 'John 3:16',
      translation: 'ESV',
      analysis_type: ['theological', 'historical', 'symbolic'],
      denomination: 'protestant',
      include_symbols: true
    };

    const analysis = await client.analyzeVerse(analysisRequest);
    console.log('✅ Analysis completed:', {
      verse: analysis.verse_range,
      confidence: analysis.confidence_score,
      processing_time: analysis.processing_time_ms
    });

    // 3. Explore theological insights
    if (analysis.analysis.theological) {
      console.log('📖 Theological themes:', analysis.analysis.theological.themes);
      console.log('⛪ Doctrines:', analysis.analysis.theological.doctrines);
    }

    // 4. Discover symbols
    if (analysis.symbols && analysis.symbols.length > 0) {
      console.log('🔣 Symbols found:', analysis.symbols.map(s => s.name));
      
      // Get relationships for first symbol
      const symbolRelationships = await client.getSymbolRelationships(analysis.symbols[0].name);
      console.log('🔗 Symbol relationships:', symbolRelationships.relationships);
    }

    // 5. View analysis history
    const history = await client.getAnalysisHistory(1, 10);
    console.log(`📚 Found ${history.pagination.total_items} previous analyses`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the demonstration
demonstrateAPI();
```

### Python Analysis Client

```python
# analysis_client.py
import requests
from typing import Dict, List, Optional, Union
from datetime import datetime

class DeeperBibleClient:
    def __init__(self, auth_client, base_url: str = "https://api.deeperbible.com"):
        self.auth = auth_client
        self.base_url = base_url

    def analyze_verse(
        self,
        verse_range: str,
        translation: str = "ESV",
        analysis_type: List[str] = None,
        denomination: str = None,
        include_symbols: bool = True
    ) -> Dict:
        """Perform comprehensive Bible verse analysis"""
        
        if analysis_type is None:
            analysis_type = ["theological"]
            
        url = f"{self.base_url}/api/analysis"
        payload = {
            "verse_range": verse_range,
            "translation": translation,
            "analysis_type": analysis_type,
            "include_symbols": include_symbols
        }
        
        if denomination:
            payload["denomination"] = denomination
            
        response = requests.post(
            url,
            json=payload,
            headers=self.auth.get_auth_headers()
        )
        
        if response.status_code == 401:
            # Try to refresh token and retry
            self.auth.refresh_access_token()
            response = requests.post(
                url,
                json=payload,
                headers=self.auth.get_auth_headers()
            )
            
        response.raise_for_status()
        return response.json()

    def get_analysis_history(self, page: int = 1, limit: int = 20) -> Dict:
        """Get user's analysis history"""
        url = f"{self.base_url}/api/analysis/history"
        params = {"page": page, "limit": limit}
        
        response = requests.get(
            url,
            params=params,
            headers=self.auth.get_auth_headers()
        )
        response.raise_for_status()
        return response.json()

    def detect_symbols(self, text: str, context: str = None) -> Dict:
        """Detect biblical symbols in text"""
        url = f"{self.base_url}/api/symbols/detect"
        payload = {"text": text}
        if context:
            payload["context"] = context
            
        response = requests.post(
            url,
            json=payload,
            headers=self.auth.get_auth_headers()
        )
        response.raise_for_status()
        return response.json()

    def get_symbol_relationships(self, symbol: str) -> Dict:
        """Get relationships for a specific symbol"""
        url = f"{self.base_url}/api/symbols/relationships"
        params = {"symbol": symbol}
        
        response = requests.get(
            url,
            params=params,
            headers=self.auth.get_auth_headers()
        )
        response.raise_for_status()
        return response.json()

    def get_usage_analytics(self, period: str = "month") -> Dict:
        """Get usage analytics"""
        url = f"{self.base_url}/api/analytics/usage"
        params = {"period": period}
        
        response = requests.get(
            url,
            params=params,
            headers=self.auth.get_auth_headers()
        )
        response.raise_for_status()
        return response.json()

# Complete demonstration
def demonstrate_api():
    """Demonstrate the complete API workflow"""
    from auth_client import DeeperBibleAuth
    
    auth = DeeperBibleAuth()
    client = DeeperBibleClient(auth)
    
    try:
        # 1. Authenticate
        auth.login("user@example.com", "password123")
        print("✅ Authentication successful")
        
        # 2. Analyze a verse
        analysis = client.analyze_verse(
            verse_range="Romans 8:28",
            translation="ESV",
            analysis_type=["theological", "historical"],
            denomination="reformed",
            include_symbols=True
        )
        
        print(f"✅ Analysis completed for {analysis['verse_range']}")
        print(f"   Confidence: {analysis['confidence_score']:.2f}")
        print(f"   Processing time: {analysis['processing_time_ms']}ms")
        
        # 3. Explore theological insights
        theological = analysis.get('analysis', {}).get('theological', {})
        if theological:
            print(f"📖 Themes: {theological.get('themes', [])}")
            print(f"⛪ Doctrines: {theological.get('doctrines', [])}")
        
        # 4. Check for symbols
        symbols = analysis.get('symbols', [])
        if symbols:
            print(f"🔣 Symbols found: {[s['name'] for s in symbols]}")
            
            # Get relationships for first symbol
            symbol_name = symbols[0]['name']
            relationships = client.get_symbol_relationships(symbol_name)
            print(f"🔗 {symbol_name} relationships: {len(relationships.get('relationships', []))}")
        
        # 5. Check usage analytics
        analytics = client.get_usage_analytics("month")
        print(f"📊 Monthly requests: {analytics['total_requests']}")
        print(f"📊 Success rate: {(1 - analytics['error_rate']) * 100:.1f}%")
        
        # 6. Get recent history
        history = client.get_analysis_history(page=1, limit=5)
        total_analyses = history['pagination']['total_items']
        print(f"📚 Total analyses in history: {total_analyses}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    demonstrate_api()
```

## Symbol Detection Examples

### Advanced Symbol Analysis

```javascript
// symbol-analysis.js
class SymbolAnalyzer {
  constructor(client) {
    this.client = client;
  }

  async analyzeSymbolsInPassage(passage, context = null) {
    try {
      // Detect symbols in the passage
      const symbolData = await this.client.detectSymbols(passage, context);
      
      const results = {
        passage,
        symbols: [],
        relationships: new Map(),
        insights: []
      };

      // Process each detected symbol
      for (const symbol of symbolData.symbols) {
        results.symbols.push(symbol);
        
        // Get relationships for each symbol
        const relationships = await this.client.getSymbolRelationships(symbol.name);
        results.relationships.set(symbol.name, relationships);
        
        // Generate insights
        const insight = this.generateSymbolInsight(symbol, relationships);
        results.insights.push(insight);
      }

      return results;
    } catch (error) {
      console.error('Symbol analysis failed:', error);
      throw error;
    }
  }

  generateSymbolInsight(symbol, relationships) {
    const relatedSymbols = relationships.relationships || [];
    const strongRelations = relatedSymbols.filter(r => r.strength > 0.7);
    
    return {
      symbol: symbol.name,
      meaning: symbol.meaning,
      biblicalContext: symbol.biblical_context,
      occurrences: symbol.occurrences,
      strongRelationships: strongRelations.map(r => ({
        symbol: r.related_symbol,
        type: r.relationship_type,
        strength: r.strength
      })),
      insight: this.generateTextualInsight(symbol, strongRelations)
    };
  }

  generateTextualInsight(symbol, relations) {
    const relationText = relations.length > 0 
      ? `strongly related to ${relations.map(r => r.related_symbol).join(', ')}`
      : 'stands independently';
      
    return `The symbol "${symbol.name}" appears ${symbol.occurrences} times in Scripture, representing ${symbol.meaning}. It is ${relationText} and carries deep theological significance in ${symbol.biblical_context}.`;
  }
}

// Usage example
async function analyzeRevelationSymbols() {
  const auth = new DeeperBibleAuth();
  const client = new DeeperBibleClient(auth);
  const analyzer = new SymbolAnalyzer(client);

  await auth.login('user@example.com', 'password123');

  const passage = "I saw a Lamb standing, as though it had been slain, with seven horns and seven eyes, which are the seven spirits of God sent out into all the earth.";
  const context = "Revelation 5:6";

  const analysis = await analyzer.analyzeSymbolsInPassage(passage, context);
  
  console.log('Symbol Analysis Results:');
  console.log('======================');
  
  analysis.insights.forEach(insight => {
    console.log(`\n🔣 ${insight.symbol.toUpperCase()}`);
    console.log(`   Meaning: ${insight.meaning}`);
    console.log(`   Occurrences: ${insight.occurrences}`);
    console.log(`   Strong relationships: ${insight.strongRelationships.length}`);
    console.log(`   Insight: ${insight.insight}`);
  });
}
```

## Client Libraries

### React Hook for API Integration

```typescript
// use-deeper-bible.ts
import { useState, useEffect, useCallback } from 'react';
import { DeeperBibleAuth, DeeperBibleClient } from './deeper-bible-client';

interface UseDeeperBibleOptions {
  autoLogin?: boolean;
  baseUrl?: string;
}

interface UseDeeperBibleReturn {
  client: DeeperBibleClient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  analyzeVerse: (request: AnalysisRequest) => Promise<AnalysisResult>;
}

export function useDeeperBible(options: UseDeeperBibleOptions = {}): UseDeeperBibleReturn {
  const [client, setClient] = useState<DeeperBibleClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = new DeeperBibleAuth(options.baseUrl);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('deeper_bible_token');
    if (token) {
      auth.token = token;
      setClient(new DeeperBibleClient(auth, options.baseUrl));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await auth.login(email, password);
      const newClient = new DeeperBibleClient(auth, options.baseUrl);
      setClient(newClient);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auth, options.baseUrl]);

  const logout = useCallback(() => {
    localStorage.removeItem('deeper_bible_token');
    localStorage.removeItem('deeper_bible_refresh_token');
    setClient(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const analyzeVerse = useCallback(async (request: AnalysisRequest) => {
    if (!client) {
      throw new Error('Not authenticated');
    }
    
    setError(null);
    try {
      return await client.analyzeVerse(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    }
  }, [client]);

  return {
    client,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    analyzeVerse,
  };
}

// React component example
function BibleAnalysisComponent() {
  const { isAuthenticated, login, analyzeVerse, error } = useDeeperBible();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeVerse({
        verse_range: 'John 3:16',
        translation: 'ESV',
        analysis_type: ['theological', 'symbolic'],
        include_symbols: true
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => login('user@example.com', 'password')}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={handleAnalysis} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze John 3:16'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {analysis && (
        <div className="analysis-results">
          <h3>{analysis.verse_range}</h3>
          <p>Confidence: {analysis.confidence_score}</p>
          {analysis.analysis.theological && (
            <div>
              <h4>Theological Analysis</h4>
              <p>Themes: {analysis.analysis.theological.themes?.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## cURL Examples

### Authentication

```bash
#!/bin/bash
# auth-examples.sh

API_BASE="https://api.deeperbible.com"

# User registration
curl -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }' | jq '.'

# User login
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Access token: $TOKEN"

# Use token for authenticated requests
curl -X GET "$API_BASE/api/users/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

### Analysis Examples

```bash
#!/bin/bash
# analysis-examples.sh

API_BASE="https://api.deeperbible.com"
TOKEN="your-auth-token-here"

# Basic verse analysis
curl -X POST "$API_BASE/api/analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verse_range": "John 3:16",
    "translation": "ESV",
    "analysis_type": ["theological"]
  }' | jq '.'

# Comprehensive analysis with symbols
curl -X POST "$API_BASE/api/analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verse_range": "Revelation 1:8",
    "translation": "ESV",
    "analysis_type": ["theological", "historical", "symbolic"],
    "denomination": "protestant",
    "include_symbols": true
  }' | jq '.'

# Get analysis history
curl -X GET "$API_BASE/api/analysis/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Symbol detection
curl -X POST "$API_BASE/api/symbols/detect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The lamb stood before the throne with seven seals",
    "context": "Revelation 5"
  }' | jq '.'

# Get symbol relationships
curl -X GET "$API_BASE/api/symbols/relationships?symbol=lamb" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Usage analytics
curl -X GET "$API_BASE/api/analytics/usage?period=month" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Error Handling Examples

```bash
#!/bin/bash
# error-handling-examples.sh

API_BASE="https://api.deeperbible.com"
TOKEN="invalid-token"

# Test with invalid token
echo "Testing with invalid token:"
curl -X GET "$API_BASE/api/users/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\n" | jq '.'

# Test with missing required field
echo "Testing with missing required field:"
curl -X POST "$API_BASE/api/analysis" \
  -H "Authorization: Bearer $VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"translation": "ESV"}' \
  -w "HTTP Status: %{http_code}\n" | jq '.'

# Test rate limiting (make many requests quickly)
echo "Testing rate limiting:"
for i in {1..15}; do
  curl -X GET "$API_BASE/api/health" \
    -w "Request $i - Status: %{http_code}\n" \
    -o /dev/null -s
  sleep 0.1
done
```

## Testing Your Integration

### Integration Test Suite

```bash
#!/bin/bash
# integration-test.sh

API_BASE="https://api.deeperbible.com"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123!"

echo "🧪 Starting Integration Tests"
echo "=============================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/health")
if [ $HEALTH_STATUS -eq 200 ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed (Status: $HEALTH_STATUS)"
  exit 1
fi

# Test 2: Authentication
echo "2. Testing authentication..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ Authentication successful"
else
  echo "❌ Authentication failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 3: Verse Analysis
echo "3. Testing verse analysis..."
ANALYSIS_RESPONSE=$(curl -s -X POST "$API_BASE/api/analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verse_range": "John 3:16",
    "translation": "ESV",
    "analysis_type": ["theological"]
  }')

ANALYSIS_ID=$(echo $ANALYSIS_RESPONSE | jq -r '.id // empty')
if [ -n "$ANALYSIS_ID" ] && [ "$ANALYSIS_ID" != "null" ]; then
  echo "✅ Analysis completed successfully"
else
  echo "❌ Analysis failed"
  echo "Response: $ANALYSIS_RESPONSE"
  exit 1
fi

# Test 4: Symbol Detection
echo "4. Testing symbol detection..."
SYMBOLS_RESPONSE=$(curl -s -X POST "$API_BASE/api/symbols/detect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The good shepherd lays down his life for the sheep",
    "context": "John 10:11"
  }')

SYMBOLS_COUNT=$(echo $SYMBOLS_RESPONSE | jq '.symbols | length')
if [ "$SYMBOLS_COUNT" -gt 0 ]; then
  echo "✅ Symbol detection found $SYMBOLS_COUNT symbols"
else
  echo "⚠️  Symbol detection found no symbols"
fi

# Test 5: Error Handling
echo "5. Testing error handling..."
ERROR_RESPONSE=$(curl -s -X POST "$API_BASE/api/analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid_field": "test"}' \
  -w "%{http_code}")

HTTP_CODE="${ERROR_RESPONSE: -3}"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Error handling working correctly"
else
  echo "❌ Unexpected response to invalid request"
fi

echo ""
echo "🎉 All integration tests completed!"
```

---

## Next Steps

1. Try the [Postman Collection](./postman-collection.json)
2. Check out language-specific [SDK documentation](../api/)
3. Read the [Developer Guide](../development/README.md) for more details
4. Join our [Developer Community](https://discord.gg/deeperbible-dev)

For more examples and updates, visit our [GitHub repository](https://github.com/your-org/deeper-bible-examples).