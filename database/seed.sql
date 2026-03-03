-- ════════════════════════════════════════════════
--  SEED DATA — Dynamic Genre Prompts
-- ════════════════════════════════════════════════

INSERT INTO genre_prompts (genre, slug, prompts, auto_detected) VALUES
  ('BGMI',
   'bgmi',
   ARRAY['BGMI Battlegrounds Mobile India gameplay Tamil', 'BGMI Tamil gaming mobile battle royale', 'Battlegrounds Mobile India Tamil match'],
   FALSE),
  ('Free Fire',
   'free-fire',
   ARRAY['Free Fire Garena battle royale Tamil gaming', 'Garena Free Fire Tamil gameplay', 'Free Fire Tamil gaming mobile'],
   FALSE),
  ('GTA V',
   'gta-v',
   ARRAY['GTA 5 Grand Theft Auto gameplay Tamil', 'Grand Theft Auto V Tamil gaming video', 'GTA V Tamil missions open world'],
   FALSE),
  ('Minecraft',
   'minecraft',
   ARRAY['Minecraft building survival Tamil gaming', 'Minecraft Tamil gameplay creative mode', 'Minecraft Tamil YouTuber series'],
   FALSE),
  ('Valorant',
   'valorant',
   ARRAY['Valorant tactical shooter Tamil esports', 'Valorant Tamil gameplay ranked match', 'Valorant agent Tamil gaming'],
   FALSE),
  ('Call of Duty',
   'call-of-duty',
   ARRAY['Call of Duty Warzone Tamil gaming', 'COD Mobile Tamil gameplay', 'Call of Duty Tamil match'],
   FALSE),
  ('eSports',
   'esports',
   ARRAY['Tamil esports tournament competitive gaming', 'esports Tamil team tournament match', 'competitive gaming Tamil championship'],
   FALSE),
  ('Streaming Commentary',
   'streaming-commentary',
   ARRAY['Tamil gaming live stream commentary reaction', 'Tamil gamer live commentary streaming', 'Tamil gaming stream talking commentary'],
   FALSE),
  ('Reaction',
   'reaction',
   ARRAY['Tamil reaction video', 'Tamil YouTuber reacting to video', 'Tamil commentary reaction'],
   FALSE),
  ('Anime',
   'anime',
   ARRAY['Anime reaction Tamil', 'Anime episode review Tamil', 'Tamil anime community video'],
   FALSE),
  ('Vlog',
   'vlog',
   ARRAY['Tamil daily life vlog', 'Tamil YouTuber travel vlog', 'Tamil personal vlog video'],
   FALSE),
  ('Others',
   'others',
   ARRAY['Tamil gaming YouTube video general', 'Tamil game video gameplay', 'Tamil gaming content creator'],
   FALSE)
ON CONFLICT (genre) DO NOTHING;

-- Initial quota row
INSERT INTO quota_usage (date, units_used)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (date) DO NOTHING;
