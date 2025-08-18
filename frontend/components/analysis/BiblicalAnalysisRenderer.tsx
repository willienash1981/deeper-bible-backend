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
  verseText?: string;
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

export function BiblicalAnalysisRenderer({ analysis, verseReference, verseText }: BiblicalAnalysisRendererProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* SEO-Optimized Header */}
        <header className="text-center space-y-6 py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Biblical Analysis: {verseReference}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deep insights and theological analysis powered by AI to help you discover a deeper understanding of God's Word
          </p>
          <Separator className="max-w-md mx-auto" />
        </header>

        {/* Scripture Text Card - Featured Section */}
        {verseText && (
          <Card className="relative overflow-hidden border-2 border-amber-200 dark:border-amber-800 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-orange-50/50 dark:from-amber-950/50 dark:via-yellow-950/30 dark:to-orange-950/50" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-2xl">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  Scripture Text
                </CardTitle>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                  {verseReference} (NIV)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-6 border border-amber-200/50 dark:border-amber-800/50">
                <blockquote className="text-xl md:text-2xl leading-relaxed font-serif text-center text-gray-800 dark:text-gray-200 italic">
                  "{verseText}"
                </blockquote>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simplified Scripture Card */}
        {(analysis as any).simplified_scripture?.paraphrase_for_clarity && (
          <Card className="relative overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-teal-950/50" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                Simplified Version
              </CardTitle>
              <CardDescription className="text-emerald-700 dark:text-emerald-300 text-base">
                Modern English for clarity and understanding
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                <blockquote className="text-lg leading-relaxed font-medium text-gray-800 dark:text-gray-200 italic">
                  "{(analysis as any).simplified_scripture.paraphrase_for_clarity}"
                </blockquote>
              </div>
              <div className="bg-emerald-50/70 dark:bg-emerald-950/70 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/50">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Why this helps:</strong> {(analysis as any).simplified_scripture.why_this_helps}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Analysis Content Grid */}
        <div className="grid gap-6 lg:gap-8">
          
          {/* Passage Overview Card */}
          {(analysis.passage_overview || analysis.summary) && (
            <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-purple-950/50" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-200 text-xl">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    Passage Overview
                  </CardTitle>
                  {(analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level) && (
                    <Badge className={getDifficultyColor(analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level)}>
                      {analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <h3 className="font-semibold text-lg mb-3 text-blue-900 dark:text-blue-100">Main Theme</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {analysis.passage_overview?.main_theme || analysis.summary?.what_is_this_passage_primarily_about}
                    </p>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <h3 className="font-semibold text-lg mb-3 text-blue-900 dark:text-blue-100">Key Message</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {analysis.passage_overview?.key_message || analysis.summary?.core_message_in_simple_terms}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Cultural Context Card */}
      {(analysis.cultural_context || (analysis as any).context?.historical_cultural_background) && (
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
                {analysis.cultural_context?.original_audience || (analysis as any).context?.historical_cultural_background?.who_was_this_written_to}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Historical Situation</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.cultural_context?.historical_situation || (analysis as any).context?.historical_cultural_background?.what_was_happening_when_written}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Cultural Practices</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.cultural_context?.cultural_practices || (analysis as any).context?.historical_cultural_background?.relevant_customs_or_practices}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explanation Card - New JSON Structure */}
      {(analysis as any).explanation?.meaning && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Understanding This Passage
            </CardTitle>
            <CardDescription>
              Clear explanation for modern readers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Clear Explanation</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).explanation.meaning.clear_explanation}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Why Modern Readers Struggle</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).explanation.meaning.why_modern_readers_struggle_with_this}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Why Understanding Matters</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).explanation.meaning.why_understanding_this_matters}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theological Insights Card - Updated for JSON Structure */}
      {((analysis as any).theological_insights && (analysis as any).theological_insights.length > 0) ||
       ((analysis as any).theology?.theological_implications) || 
       (analysis.theological_insights?.insight && analysis.theological_insights.insight.length > 0) && (
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
          <CardContent className="space-y-4">
            {/* New JSON array structure */}
            {(analysis as any).theological_insights && (analysis as any).theological_insights.length > 0 && (
              <div className="space-y-6">
                {(analysis as any).theological_insights.map((insight: any, index: number) => (
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
                    {index < (analysis as any).theological_insights.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
            {/* Simplified single theology structure */}
            {(analysis as any).theology?.theological_implications && (
              <div>
                <h3 className="font-semibold mb-2">Theological Principle</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {(analysis as any).theology.theological_implications.theological_principle}
                </p>
                <Separator className="my-4" />
                <h3 className="font-semibold mb-2">How This Applies Today</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {(analysis as any).theology.theological_implications.how_this_applies_today}
                </p>
              </div>
            )}
            {/* Legacy XML structure */}
            {analysis.theological_insights?.insight && analysis.theological_insights.insight.length > 0 && (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Practical Application Card - Updated for JSON Structure */}
      {((analysis as any).application?.personal_reflection || analysis.practical_application) && (
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
              <h3 className="font-semibold mb-2">Contemporary Application</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).application?.personal_reflection?.how_this_applies_to_contemporary_life || analysis.practical_application?.modern_relevance}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Ways to Live This Out</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).application?.personal_reflection?.specific_ways_to_live_this_out || analysis.practical_application?.action_points}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Questions for Reflection</h3>
              <p className="text-muted-foreground leading-relaxed">
                {(analysis as any).application?.personal_reflection?.questions_for_deeper_consideration || analysis.practical_application?.reflection_questions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confusing Elements Card */}
      {((analysis as any).confusing_elements && (analysis as any).confusing_elements.length > 0) || 
       (analysis.confusing_elements?.element && analysis.confusing_elements.element.length > 0) && (
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
              {/* New JSON structure */}
              {(analysis as any).confusing_elements && (analysis as any).confusing_elements.map((element: any, index: number) => (
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
                  {index < (analysis as any).confusing_elements.length - 1 && <Separator />}
                </div>
              ))}
              {/* Legacy XML structure */}
              {analysis.confusing_elements?.element && analysis.confusing_elements.element.map((element, index) => (
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
      {(((analysis as any).symbols_and_metaphors && (analysis as any).symbols_and_metaphors.length > 0) ||
        (analysis.symbols_and_metaphors?.symbol && analysis.symbols_and_metaphors.symbol.length > 0)) && (
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
              {/* New JSON array structure */}
              {(analysis as any).symbols_and_metaphors && (analysis as any).symbols_and_metaphors.map((symbol: any, index: number) => (
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
                  {index < (analysis as any).symbols_and_metaphors.length - 1 && <Separator />}
                </div>
              ))}
              {/* Legacy XML structure */}
              {analysis.symbols_and_metaphors?.symbol && analysis.symbols_and_metaphors.symbol.map((symbol, index) => (
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
      {(((analysis as any).cross_references && (analysis as any).cross_references.length > 0) ||
        (analysis.connections?.connection && analysis.connections.connection.length > 0)) && (
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
              {/* New JSON array structure */}
              {(analysis as any).cross_references && (analysis as any).cross_references.map((connection: any, index: number) => (
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
                  {index < (analysis as any).cross_references.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              {/* Legacy XML structure */}
              {analysis.connections?.connection && analysis.connections.connection.map((connection, index) => (
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

      {/* Denominational Perspectives Card */}
      {(analysis as any).denominational_perspectives && (analysis as any).denominational_perspectives.length > 0 && (
        <Card className="border-l-4 border-l-violet-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Denominational Perspectives
            </CardTitle>
            <CardDescription>
              How different Christian traditions understand this passage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(analysis as any).denominational_perspectives.map((perspective: any, index: number) => (
                <div key={index} className="space-y-3">
                  <h3 className="font-semibold text-lg">{perspective.tradition}</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Interpretation</h4>
                      <p className="text-muted-foreground leading-relaxed">{perspective.interpretation}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Key Emphasis</h4>
                      <p className="text-muted-foreground leading-relaxed">{perspective.emphasis}</p>
                    </div>
                  </div>
                  {index < (analysis as any).denominational_perspectives.length - 1 && <Separator />}
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
      {(analysis.summary || (analysis as any).conclusion) && (
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
                {analysis.summary?.key_takeaway || (analysis as any).conclusion?.key_takeaway?.most_important_thing_to_understand}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Memorable Insight</h3>
              <p className="text-muted-foreground leading-relaxed">
                {analysis.summary?.memorable_insight || (analysis as any).conclusion?.key_takeaway?.something_that_will_stick_with_reader}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

        </div>
        
        {/* Footer */}
        <footer className="mt-12 mb-8">
          <Card className="relative overflow-hidden border-2 border-amber-200 dark:border-amber-800 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-red-50/50 dark:from-amber-950/50 dark:via-orange-950/30 dark:to-red-950/50" />
            <CardContent className="relative text-center py-8">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  ⚠️ Never take this information as true gospel.
                </p>
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  It's up to you, the reader, to dig into the Bible and ask the Holy Spirit for revelation and truth. 
                  This is just a guide to help you search into a <strong className="text-amber-800 dark:text-amber-200">Deeper Bible</strong>.
                </p>
                <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-4 border border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-sm text-amber-700 dark:text-amber-300 italic font-medium">
                    "Study to show yourself approved unto God, a workman that needs not to be ashamed, 
                    rightly dividing the word of truth." - 2 Timothy 2:15
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Continue to study with prayer, the Holy Spirit's guidance, and in community with other believers.
                </p>
              </div>
            </CardContent>
          </Card>
        </footer>
        
      </div>
    </div>
  );
}