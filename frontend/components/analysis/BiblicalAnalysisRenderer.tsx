'use client';

import React from 'react';
import { BiblicalAnalysis } from '@/lib/types/xml-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Cross, Users, Lightbulb, MessageSquare, Heart } from 'lucide-react';

interface BiblicalAnalysisRendererProps {
  analysis: BiblicalAnalysis;
  verseReference: string;
}

const getDifficultyColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'beginner': return 'bg-green-100 text-green-800 border-green-300';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'advanced': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

const getCategoryIcon = (category: string) => {
  const categoryLower = category?.toLowerCase() || '';
  if (categoryLower.includes('salvation') || categoryLower.includes('gospel')) return <Cross className="w-4 h-4" />;
  if (categoryLower.includes('sanctification') || categoryLower.includes('spiritual')) return <Heart className="w-4 h-4" />;
  if (categoryLower.includes('christology') || categoryLower.includes('christ')) return <Cross className="w-4 h-4" />;
  if (categoryLower.includes('community') || categoryLower.includes('church')) return <Users className="w-4 h-4" />;
  return <Lightbulb className="w-4 h-4" />;
};

export function BiblicalAnalysisRenderer({ analysis, verseReference }: BiblicalAnalysisRendererProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* SEO-Optimized Header */}
      <header className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Biblical Analysis: {verseReference}
        </h1>
        <p className="text-lg text-muted-foreground">
          Deep insights and theological analysis powered by AI
        </p>
      </header>

      {/* Passage Overview Card */}
      {(analysis.passage_overview || analysis.summary) && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Passage Overview
              </CardTitle>
              {(analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level) && (
                <Badge className={getDifficultyColor(analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level)}>
                  {analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Main Theme</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.passage_overview?.main_theme || analysis.summary?.what_is_this_passage_primarily_about}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Key Message</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.passage_overview?.key_message || analysis.summary?.core_message_in_simple_terms}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cultural Context Card */}
      {analysis.cultural_context && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Cultural Context
            </CardTitle>
            <CardDescription>
              Understanding the historical and cultural background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Original Audience</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.cultural_context.original_audience}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Historical Situation</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.cultural_context.historical_situation}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Cultural Practices</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.cultural_context.cultural_practices}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confusing Elements Card */}
      {analysis.confusing_elements?.element && analysis.confusing_elements.element.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Confusing Elements Explained
            </CardTitle>
            <CardDescription>
              Clarifying concepts that modern readers might find challenging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysis.confusing_elements.element.map((element, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{element.term}</h3>
                    <Badge variant="outline" className="text-xs">
                      {element.type}
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation</h4>
                      <p className="text-muted-foreground">{element.explanation}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Why Confusing</h4>
                      <p className="text-muted-foreground">{element.why_confusing}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Significance</h4>
                      <p className="text-muted-foreground">{element.significance}</p>
                    </div>
                  </div>
                  {index < analysis.confusing_elements.element.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theological Insights Card */}
      {analysis.theological_insights?.insight && analysis.theological_insights.insight.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cross className="w-5 h-5" />
              Theological Insights
            </CardTitle>
            <CardDescription>
              Deep theological truths and their applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysis.theological_insights.insight.map((insight, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(insight.category)}
                    <h3 className="font-semibold text-lg">{insight.category}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Truth</h4>
                      <p className="text-muted-foreground leading-relaxed">{insight.truth}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Application</h4>
                      <p className="text-muted-foreground leading-relaxed">{insight.application}</p>
                    </div>
                  </div>
                  {index < analysis.theological_insights.insight.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symbols and Metaphors Card */}
      {analysis.symbols_and_metaphors?.symbol && analysis.symbols_and_metaphors.symbol.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Symbols and Metaphors
            </CardTitle>
            <CardDescription>
              Understanding the deeper symbolic meanings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysis.symbols_and_metaphors.symbol.map((symbol, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="font-semibold text-lg">{symbol.term}</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Meaning</h4>
                      <p className="text-muted-foreground">{symbol.meaning}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Biblical Pattern</h4>
                      <p className="text-muted-foreground">{symbol.biblical_pattern}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Deeper Significance</h4>
                      <p className="text-muted-foreground">{symbol.deeper_significance}</p>
                    </div>
                  </div>
                  {index < analysis.symbols_and_metaphors.symbol.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-References Card */}
      {analysis.connections?.connection && analysis.connections.connection.length > 0 && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Cross-References
            </CardTitle>
            <CardDescription>
              Related passages that illuminate this text
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.connections.connection.map((connection, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{connection.verse}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {connection.relationship}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {connection.explanation}
                  </p>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Insight: {connection.insight}
                  </p>
                  {index < analysis.connections.connection.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practical Application Card */}
      {analysis.practical_application && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Practical Application
            </CardTitle>
            <CardDescription>
              How this passage applies to contemporary life
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Modern Relevance</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.practical_application.modern_relevance}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Action Points</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.practical_application.action_points}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Reflection Questions</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.practical_application.reflection_questions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {analysis.summary && (
        <Card className="border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Key Takeaway</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.summary.key_takeaway}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Memorable Insight</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.summary.memorable_insight}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-muted-foreground border-t">
        <p>
          This analysis was generated using AI-powered biblical study tools with sophisticated theological prompts.
          <br />
          Continue to study with prayer and in community with other believers.
        </p>
      </footer>
    </div>
  );
}