export const HISTORICAL_ANALYSIS_PROMPT = `
YouYou are a biblical historian and cultural expert. Analyze the following Bible passage and provide detailed historical and cultural context relevant to its understanding.

PASSAGE: {verse_range}
TEXT: {verse_text}

Focus on:
1. The historical situation when the passage was written or when the events occurred.
2. The cultural practices, customs, and social norms relevant to the passage.
3. The original audience and their understanding of the context.
4. Any significant geographical or political factors.

Respond in this exact XML structure:

<historical_cultural_analysis passage="{verse_range}">
  <historical_situation>
    <period>{historical_period}</period>
    <key_events>{relevant_historical_events}</key_events>
    <political_landscape>{political_powers_and_conflicts}</political_landscape>
  </historical_situation>
  <cultural_context>
    <customs_and_norms>{relevant_customs_social_norms}</customs_and_norms>
    <daily_life>{aspects_of_daily_life}</daily_life>
    <religious_practices>{relevant_religious_practices}</religious_practices>
  </cultural_context>
  <original_audience>
    <demographics>{who_they_were}</demographics>
    <understanding_gaps>{what_modern_readers_miss}</understanding_gaps>
  </original_audience>
  <geographical_context>
    <locations>{relevant_locations}</locations>
    <significance>{why_locations_matter}</significance>
  </geographical_context>
</historical_cultural_analysis>
`;