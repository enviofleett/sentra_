-- Insert sample perfume articles
INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, is_published, is_featured, published_at)
VALUES 
(
  'The Art of Layering Fragrances',
  'the-art-of-layering-fragrances',
  'Master the technique of combining multiple scents to create your own unique signature fragrance that evolves throughout the day.',
  '<p>Fragrance layering is an art form that allows you to create a truly personalized scent experience. By combining multiple fragrances strategically, you can craft a signature aroma that''s uniquely yours.</p>

<h2>Why Layer Fragrances?</h2>
<p>Single fragrances, while beautiful, can sometimes feel one-dimensional. Layering adds depth, complexity, and longevity to your scent profile. It''s the difference between wearing a color and painting a masterpiece.</p>

<h2>The Golden Rules of Layering</h2>
<p><strong>1. Start with a Base:</strong> Begin with your heaviest, most intense fragrance. Oriental, woody, or musky scents work wonderfully as foundations.</p>
<p><strong>2. Add Complementary Notes:</strong> Choose fragrances that share at least one common note with your base. This creates harmony rather than discord.</p>
<p><strong>3. Less is More:</strong> Two to three fragrances maximum. Beyond that, you risk creating an overwhelming olfactory experience.</p>

<h2>Recommended Combinations</h2>
<ul>
<li><strong>Warm Vanilla + Fresh Citrus:</strong> The sweetness of vanilla tempered by bright bergamot or orange creates an inviting, approachable signature.</li>
<li><strong>Rose + Oud:</strong> A classic Middle Eastern combination that balances floral femininity with deep, mysterious woods.</li>
<li><strong>Sandalwood + Lavender:</strong> Creamy wood notes paired with herbal freshness for a sophisticated, calming effect.</li>
</ul>

<p>Experiment with your collection and discover combinations that speak to your personality. The best signature scent is one that makes you feel confident and memorable.</p>',
  'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200&q=80',
  true,
  true,
  NOW() - INTERVAL '1 day'
),
(
  'Understanding Scent Families: A Complete Guide',
  'understanding-scent-families',
  'Navigate the world of perfumery with confidence by learning about the major fragrance families and their characteristics.',
  '<p>Every fragrance belongs to a family—a classification system that helps us understand and communicate about scents. Knowing these families empowers you to discover fragrances you''ll love.</p>

<h2>The Four Major Fragrance Families</h2>

<h3>1. Floral</h3>
<p>The largest and most popular family, featuring flower-based compositions. From single-flower soliflores like rose or jasmine to complex bouquets, florals range from light and romantic to rich and intoxicating.</p>
<p><em>Best for:</em> Those who appreciate femininity, romance, and classic elegance.</p>

<h3>2. Oriental</h3>
<p>Warm, sensual, and mysterious. Oriental fragrances feature vanilla, amber, musk, and exotic spices. They''re perfect for evening wear and cooler months.</p>
<p><em>Best for:</em> Those seeking depth, warmth, and memorable presence.</p>

<h3>3. Woody</h3>
<p>Grounded and sophisticated, woody fragrances showcase sandalwood, cedar, vetiver, and oud. They provide excellent longevity and work beautifully for both day and evening.</p>
<p><em>Best for:</em> Those who prefer understated elegance and natural sophistication.</p>

<h3>4. Fresh</h3>
<p>Clean, invigorating, and versatile. This family includes citrus, green, aquatic, and aromatic fragrances. Perfect for daytime, warm weather, and professional settings.</p>
<p><em>Best for:</em> Those who favor approachable, energizing scents.</p>

<h2>Finding Your Family</h2>
<p>Most people gravitate toward two or three families. Pay attention to which scents you consistently reach for—this reveals your olfactory preferences and guides future purchases.</p>',
  'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=1200&q=80',
  true,
  false,
  NOW() - INTERVAL '3 days'
),
(
  'Seasonal Perfume Guide: Scents for Every Season',
  'seasonal-perfume-guide',
  'Discover how to adapt your fragrance wardrobe throughout the year for maximum impact and enjoyment.',
  '<p>Just as you rotate your clothing with the seasons, your fragrance collection deserves the same attention. Temperature, humidity, and mood all influence how a perfume performs and is perceived.</p>

<h2>Spring: Fresh Beginnings</h2>
<p>As nature awakens, reach for light florals and green scents. Notes of lily of the valley, peony, and fresh-cut grass capture the season''s renewal.</p>
<p><strong>Recommended notes:</strong> Green tea, wisteria, dewy roses, cucumber, light musks</p>

<h2>Summer: Bright & Breezy</h2>
<p>Heat intensifies fragrance projection, so opt for lighter concentrations. Citrus, aquatic, and tropical notes shine in warm weather.</p>
<p><strong>Recommended notes:</strong> Bergamot, coconut, marine accords, white florals, lime</p>

<h2>Autumn: Warm Transitions</h2>
<p>As temperatures drop, introduce spicy and woody elements. This is the season for apple, cinnamon, and dried leaves.</p>
<p><strong>Recommended notes:</strong> Cardamom, amber, suede, fig, tobacco leaf</p>

<h2>Winter: Rich & Opulent</h2>
<p>Cold weather calls for powerful, enveloping scents. Oriental fragrances, heavy woods, and gourmand notes provide comfort and warmth.</p>
<p><strong>Recommended notes:</strong> Vanilla, oud, frankincense, dark chocolate, balsamic resins</p>

<h2>Building a Seasonal Collection</h2>
<p>Start with one signature scent per season. As your collection grows, add variety within each category to match different occasions and moods.</p>',
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=80',
  true,
  false,
  NOW() - INTERVAL '5 days'
),
(
  'How to Make Your Fragrance Last Longer',
  'make-fragrance-last-longer',
  'Expert tips and techniques to maximize the longevity and sillage of your favorite perfumes.',
  '<p>Nothing is more frustrating than a beautiful fragrance that fades within hours. With these proven techniques, you can extend the life of your scent from morning to evening.</p>

<h2>Preparation is Key</h2>
<p><strong>Moisturize First:</strong> Fragrance clings to hydrated skin. Apply an unscented lotion or the matching body cream before spraying your perfume.</p>
<p><strong>Apply After Showering:</strong> Warm, slightly damp skin absorbs fragrance molecules more effectively than dry skin.</p>

<h2>Strategic Application Points</h2>
<p>Pulse points radiate heat, which helps diffuse your fragrance throughout the day:</p>
<ul>
<li>Inner wrists (don''t rub them together!)</li>
<li>Behind the ears</li>
<li>Base of the throat</li>
<li>Inside elbows</li>
<li>Behind the knees</li>
</ul>

<h2>The Hair Trick</h2>
<p>Spray fragrance on your hairbrush, then run it through your hair. The fibers hold scent beautifully and release it with movement throughout the day.</p>

<h2>Storage Matters</h2>
<p>Heat, light, and humidity degrade perfume over time. Store your bottles in a cool, dark place—never in the bathroom. A bedroom drawer or closet shelf is ideal.</p>

<h2>Layer Strategically</h2>
<p>Use matching shower gels, lotions, and perfumes from the same line. This builds a foundation that extends the fragrance experience significantly.</p>',
  'https://images.unsplash.com/photo-1619994403073-2cec844b8e63?w=1200&q=80',
  true,
  false,
  NOW() - INTERVAL '7 days'
),
(
  'Niche vs Designer: Understanding the Difference',
  'niche-vs-designer-fragrances',
  'Explore the distinctions between niche and designer perfumes to make informed choices for your collection.',
  '<p>The fragrance world is broadly divided into two categories: designer and niche. Understanding their differences helps you navigate the market and find scents that truly resonate with you.</p>

<h2>Designer Fragrances</h2>
<p>Created by fashion houses like Chanel, Dior, and Gucci, designer fragrances are crafted for mass appeal. They''re widely available, heavily marketed, and designed to please the broadest possible audience.</p>
<p><strong>Characteristics:</strong></p>
<ul>
<li>Accessible pricing (generally ₦30,000-₦150,000)</li>
<li>Wide distribution in department stores</li>
<li>Focus on wearability and mass appeal</li>
<li>Heavy advertising campaigns</li>
</ul>

<h2>Niche Fragrances</h2>
<p>Niche houses like Byredo, Le Labo, and Amouage prioritize artistic expression over commercial viability. These fragrances are often more complex, unusual, and polarizing.</p>
<p><strong>Characteristics:</strong></p>
<ul>
<li>Premium pricing (₦100,000-₦500,000+)</li>
<li>Limited distribution, often exclusive retailers</li>
<li>Focus on quality ingredients and artistry</li>
<li>Minimal marketing, word-of-mouth driven</li>
</ul>

<h2>Which is Right for You?</h2>
<p>Neither category is inherently better. Designer fragrances offer reliability and value, while niche provides uniqueness and artistic expression. Many enthusiasts enjoy both, building collections that include crowd-pleasers alongside artistic statements.</p>',
  'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&q=80',
  true,
  false,
  NOW() - INTERVAL '10 days'
),
(
  'The Psychology of Scent: How Fragrance Affects Mood',
  'psychology-of-scent',
  'Discover the powerful connection between fragrance and emotion, and how to harness scent for wellbeing.',
  '<p>Our sense of smell is directly connected to the limbic system—the brain''s emotional center. This explains why certain scents can instantly transport us to memories or dramatically shift our mood.</p>

<h2>Scent and Memory</h2>
<p>The olfactory bulb has direct connections to the amygdala and hippocampus, brain regions responsible for emotion and memory. This is why a whiff of your grandmother''s perfume can bring her vividly to mind, even decades later.</p>

<h2>Mood-Boosting Scents</h2>
<p><strong>For Energy:</strong> Citrus notes like lemon, grapefruit, and orange stimulate alertness and positivity.</p>
<p><strong>For Calm:</strong> Lavender, chamomile, and sandalwood promote relaxation and reduce anxiety.</p>
<p><strong>For Confidence:</strong> Warm spices, leather, and oud create a sense of power and self-assurance.</p>
<p><strong>For Romance:</strong> Rose, jasmine, and vanilla evoke sensuality and intimacy.</p>

<h2>Using Scent Intentionally</h2>
<p>Consider how you want to feel when selecting your daily fragrance:</p>
<ul>
<li>Important presentation? Choose something that makes you feel powerful.</li>
<li>Relaxing weekend? Opt for comforting, familiar scents.</li>
<li>Date night? Select something that makes you feel attractive and confident.</li>
</ul>

<p>Your fragrance is a tool for emotional regulation. Use it wisely to enhance your daily experience and project the energy you desire.</p>',
  'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=1200&q=80',
  true,
  false,
  NOW() - INTERVAL '12 days'
);
