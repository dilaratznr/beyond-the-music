import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data (order matters for foreign keys)
  await prisma.listeningPathItem.deleteMany();
  await prisma.listeningPath.deleteMany();
  await prisma.article.deleteMany();
  await prisma.architectArtist.deleteMany();
  await prisma.architect.deleteMany();
  await prisma.song.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artistGenre.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany({ where: { parentId: { not: null } } });
  await prisma.genre.deleteMany();
  await prisma.mediaItem.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@beyondthemusic.com' },
    update: {},
    create: { email: 'admin@beyondthemusic.com', password: hashedPassword, name: 'Ziya Burak Erol', role: 'SUPER_ADMIN' },
  });

  // ─── GENRES ───
  const rock = await prisma.genre.create({ data: { slug: 'rock', nameTr: 'Rock', nameEn: 'Rock', order: 1, image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&q=80', descriptionTr: 'Rock bir patlamadır. 1940\'ların sonu, 50\'lerin başı. Blues şehirde elektrikle buluşmuştu. Country ritmik bir hareket taşıyordu. İkisi birleştiğinde ortaya daha sert, daha hızlı, daha asi bir ses çıktı.', descriptionEn: 'Rock is an explosion. Late 1940s, early 1950s. Blues had met electricity in the city. Country carried a rhythmic movement. When the two merged, a harder, faster, more rebellious sound emerged.' } });
  const jazz = await prisma.genre.create({ data: { slug: 'jazz', nameTr: 'Jazz', nameEn: 'Jazz', order: 2, image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80', descriptionTr: 'Jazz, 20. yüzyılın başında ABD\'nin güneyinde, özellikle New Orleans\'ta doğmuş bir müzik türüdür. Afrika kökenli ritmik yapılar, blues melodileri ve Avrupa armoni geleneğinin benzersiz bir sentezinden ortaya çıkmıştır.', descriptionEn: 'Jazz emerged in the early 20th century in the American South, particularly New Orleans. It arose from a unique synthesis of African rhythmic structures, blues melodies, and European harmonic traditions.' } });
  const blues = await prisma.genre.create({ data: { slug: 'blues', nameTr: 'Blues', nameEn: 'Blues', order: 3, image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80', descriptionTr: 'Blues, acının müziğidir. Mississippi deltasından doğan bu tür, kölelik sonrası Afro-Amerikan deneyiminin ses bulmuş halidir. 12 bar blues yapısı, tüm modern popüler müziğin temelini oluşturur.', descriptionEn: 'Blues is the music of pain. Born from the Mississippi Delta, this genre is the voiced experience of post-slavery African Americans. The 12-bar blues structure forms the foundation of all modern popular music.' } });
  const electronic = await prisma.genre.create({ data: { slug: 'electronic', nameTr: 'Elektronik', nameEn: 'Electronic', order: 4, image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', descriptionTr: 'Elektronik müzik, sentezleyiciler, drum machine\'ler ve dijital üretim araçlarıyla yaratılan geniş bir müzik ailesidir. Detroit teknosu, Chicago house ve Berlin minimal sahnesinden dünya çapında yayılmıştır.', descriptionEn: 'Electronic music is a broad family of music created with synthesizers, drum machines, and digital production tools. It spread worldwide from Detroit techno, Chicago house, and the Berlin minimal scene.' } });
  const soul = await prisma.genre.create({ data: { slug: 'soul', nameTr: 'Soul', nameEn: 'Soul', order: 5, image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', descriptionTr: 'Soul müzik, gospel\'ın ruhani gücünü R&B\'nin ritmik yapısıyla birleştirir. 1950\'lerin sonunda ortaya çıkan bu tür, duygu yoğunluğu ve vokal performansıyla tanınır.', descriptionEn: 'Soul music combines the spiritual power of gospel with the rhythmic structure of R&B. Emerging in the late 1950s, this genre is known for its emotional intensity and vocal performance.' } });
  const rap = await prisma.genre.create({ data: { slug: 'rap', nameTr: 'Rap', nameEn: 'Rap', order: 6, image: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=800&q=80', descriptionTr: 'Hip-hop kültürünün müzikal ifadesi olan rap, 1970\'lerin Bronx\'unda doğdu. Ritmik konuşma, sampling ve beat yapımı üzerine kurulu bu tür, günümüzün en etkili müzik formlarından biridir.', descriptionEn: 'Rap, the musical expression of hip-hop culture, was born in the Bronx in the 1970s. Built on rhythmic speech, sampling, and beat-making, this genre is one of today\'s most influential music forms.' } });
  const classical = await prisma.genre.create({ data: { slug: 'classical', nameTr: 'Klasik', nameEn: 'Classical', order: 7, image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80', descriptionTr: 'Batı klasik müziği, yaklaşık bin yıllık bir geleneğe sahiptir. Barok, Klasik, Romantik ve Modern dönemlerden geçerek evrilmiş; orkestral, oda müziği ve solo eser formlarında zengin bir repertuvar oluşturmuştur.', descriptionEn: 'Western classical music has a tradition spanning roughly a thousand years. It evolved through the Baroque, Classical, Romantic, and Modern periods, creating a rich repertoire in orchestral, chamber music, and solo forms.' } });
  const funk = await prisma.genre.create({ data: { slug: 'funk', nameTr: 'Funk', nameEn: 'Funk', order: 8, image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&q=80' } });
  const disco = await prisma.genre.create({ data: { slug: 'disco', nameTr: 'Disco', nameEn: 'Disco', order: 9, image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&q=80' } });
  const pop = await prisma.genre.create({ data: { slug: 'pop', nameTr: 'Pop', nameEn: 'Pop', order: 10, image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80' } });
  const rnb = await prisma.genre.create({ data: { slug: 'rnb', nameTr: 'R&B', nameEn: 'R&B', order: 11, image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&q=80' } });
  const gospel = await prisma.genre.create({ data: { slug: 'gospel', nameTr: 'Gospel', nameEn: 'Gospel', order: 12 } });
  const reggae = await prisma.genre.create({ data: { slug: 'reggae', nameTr: 'Reggae', nameEn: 'Reggae', order: 13, image: 'https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=800&q=80' } });
  const latin = await prisma.genre.create({ data: { slug: 'latin', nameTr: 'Latin', nameEn: 'Latin', order: 14, image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80' } });
  const country = await prisma.genre.create({ data: { slug: 'country', nameTr: 'Country', nameEn: 'Country', order: 15, image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800&q=80' } });
  const traditional = await prisma.genre.create({ data: { slug: 'traditional', nameTr: 'Geleneksel', nameEn: 'Traditional', order: 16 } });

  // ─── SUBGENRES ───
  const grunge = await prisma.genre.create({ data: { slug: 'grunge', nameTr: 'Grunge', nameEn: 'Grunge', parentId: rock.id, order: 1, image: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&q=80', descriptionTr: 'Grunge, 1980\'lerin ortasında ABD\'nin Pasifik Kuzeybatısı\'nda, özellikle Seattle merkezli olarak doğmuş bir alt türdür. Punk\'ın ham enerjisini heavy metal\'in kalın gitar tonlarıyla birleştirir.', descriptionEn: 'Grunge is a subgenre born in the mid-1980s in the Pacific Northwest of the USA, particularly centered in Seattle. It combines the raw energy of punk with the thick guitar tones of heavy metal.' } });
  const altRock = await prisma.genre.create({ data: { slug: 'alternative-rock', nameTr: 'Alternatif Rock', nameEn: 'Alternative Rock', parentId: rock.id, order: 2 } });
  const punkRock = await prisma.genre.create({ data: { slug: 'punk-rock', nameTr: 'Punk Rock', nameEn: 'Punk Rock', parentId: rock.id, order: 3, image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800&q=80', descriptionTr: 'Punk rock, 1970\'lerin ortasında hem New York hem de Londra\'da eş zamanlı olarak ortaya çıkmış hızlı, sert ve minimalist bir rock alt türüdür. DIY etiği ve anti-otoriter duruşuyla bilinir.', descriptionEn: 'Punk rock is a fast, aggressive, and minimalist rock subgenre that emerged simultaneously in New York and London in the mid-1970s. Known for its DIY ethic and anti-authoritarian stance.' } });
  const progRock = await prisma.genre.create({ data: { slug: 'progressive-rock', nameTr: 'Progresif Rock', nameEn: 'Progressive Rock', parentId: rock.id, order: 4 } });
  const psychRock = await prisma.genre.create({ data: { slug: 'psychedelic-rock', nameTr: 'Psychedelic Rock', nameEn: 'Psychedelic Rock', parentId: rock.id, order: 5 } });
  await prisma.genre.create({ data: { slug: 'blues-rock', nameTr: 'Blues Rock', nameEn: 'Blues Rock', parentId: rock.id, order: 6 } });
  const bebop = await prisma.genre.create({ data: { slug: 'bebop', nameTr: 'Bebop', nameEn: 'Bebop', parentId: jazz.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'acid-jazz', nameTr: 'Acid Jazz', nameEn: 'Acid Jazz', parentId: jazz.id, order: 2 } });
  await prisma.genre.create({ data: { slug: 'avant-garde-jazz', nameTr: 'Avant-Garde Jazz', nameEn: 'Avant-Garde Jazz', parentId: jazz.id, order: 3 } });
  await prisma.genre.create({ data: { slug: 'acid-house', nameTr: 'Acid House', nameEn: 'Acid House', parentId: electronic.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'ambient', nameTr: 'Ambient', nameEn: 'Ambient', parentId: electronic.id, order: 2 } });
  await prisma.genre.create({ data: { slug: 'darkwave', nameTr: 'Darkwave', nameEn: 'Darkwave', parentId: electronic.id, order: 3 } });
  await prisma.genre.create({ data: { slug: 'boom-bap', nameTr: 'Boom Bap', nameEn: 'Boom Bap', parentId: rap.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'cloud-rap', nameTr: 'Cloud Rap', nameEn: 'Cloud Rap', parentId: rap.id, order: 2 } });
  await prisma.genre.create({ data: { slug: 'chicago-blues', nameTr: 'Chicago Blues', nameEn: 'Chicago Blues', parentId: blues.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'bossa-nova', nameTr: 'Bossa Nova', nameEn: 'Bossa Nova', parentId: latin.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'afrobeat', nameTr: 'Afrobeat', nameEn: 'Afrobeat', parentId: traditional.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'bluegrass', nameTr: 'Bluegrass', nameEn: 'Bluegrass', parentId: country.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'baroque-pop', nameTr: 'Baroque Pop', nameEn: 'Baroque Pop', parentId: pop.id, order: 1 } });
  await prisma.genre.create({ data: { slug: 'britpop', nameTr: 'Britpop', nameEn: 'Britpop', parentId: pop.id, order: 2 } });

  console.log('Genres & subgenres seeded');

  // ─── ARTISTS ───
  const nirvana = await prisma.artist.create({ data: { slug: 'nirvana', name: 'Nirvana', type: 'GROUP', image: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=600&q=80', bioTr: 'Nirvana, 1987 yılında ABD\'nin Washington eyaletinde, Aberdeen\'da Kurt Cobain ve Krist Novoselic tarafından kuruldu. 1990\'da Dave Grohl\'un katılımıyla kadro tamamlandı. 1991 tarihli Nevermind albümü, grunge\'ı alternatif sahneden ana akıma taşıyan kırılma noktasıdır. Nirvana\'nın müziği punk\'ın yalın enerjisini melodiyle birleştiriyordu. 1994\'te Kurt Cobain\'in ölümüyle grup sona erdi.', bioEn: 'Nirvana was formed in 1987 in Aberdeen, Washington by Kurt Cobain and Krist Novoselic. The lineup was completed with Dave Grohl joining in 1990. Their 1991 album Nevermind was the breaking point that carried grunge from the alternative scene to the mainstream. Nirvana\'s music combined punk\'s raw energy with melody. The band ended with Kurt Cobain\'s death in 1994.' } });
  const radiohead = await prisma.artist.create({ data: { slug: 'radiohead', name: 'Radiohead', type: 'GROUP', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80', bioTr: 'Radiohead, 1985\'te Oxford\'da kurulmuş İngiliz rock grubudur. OK Computer ve Kid A albümleriyle rock müziğin sınırlarını elektronik ve deneysel alanlara genişletmiştir. Thom Yorke\'un kırılgan vokalleri ve grubun yenilikçi yaklaşımı, onları çağdaş müziğin en etkili isimlerinden biri yapmıştır.', bioEn: 'Radiohead is a British rock band formed in Oxford in 1985. With albums like OK Computer and Kid A, they expanded the boundaries of rock music into electronic and experimental territories. Thom Yorke\'s fragile vocals and the band\'s innovative approach made them one of the most influential names in contemporary music.' } });
  const milesD = await prisma.artist.create({ data: { slug: 'miles-davis', name: 'Miles Davis', type: 'SOLO', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80', bioTr: 'Miles Davis, jazz tarihinin en etkili trompetçisi ve yenilikçisidir. Bebop\'tan cool jazz\'a, hard bop\'tan fusion\'a kadar her yeni jazz akımının merkezinde yer almıştır. Kind of Blue albümü tüm zamanların en çok satan jazz albümüdür.', bioEn: 'Miles Davis is the most influential trumpeter and innovator in jazz history. He stood at the center of every new jazz movement from bebop to cool jazz, hard bop to fusion. Kind of Blue remains the best-selling jazz album of all time.' } });
  const pinkFloyd = await prisma.artist.create({ data: { slug: 'pink-floyd', name: 'Pink Floyd', type: 'GROUP', image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=600&q=80', bioTr: 'Pink Floyd, 1965\'te Londra\'da kurulan İngiliz progresif rock grubudur. The Dark Side of the Moon ve The Wall gibi konsept albümleriyle müzik tarihinin en ikonik gruplarından biri haline gelmiştir. Deneysel ses tasarımı, felsefi sözler ve görsel sahne şovlarıyla tanınır.', bioEn: 'Pink Floyd is a British progressive rock band formed in London in 1965. With concept albums like The Dark Side of the Moon and The Wall, they became one of the most iconic bands in music history. Known for experimental sound design, philosophical lyrics, and visual stage shows.' } });
  const bobMarley = await prisma.artist.create({ data: { slug: 'bob-marley', name: 'Bob Marley', type: 'SOLO', image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&q=80', bioTr: 'Bob Marley, reggae müziğini dünyaya tanıtan Jamaikalı müzisyendir. Müziği toplumsal adalet, barış ve Rastafari ruhani geleneğini taşır. Exodus, Natty Dread ve Legend derlemeleri onu müzik tarihinin en önemli figürlerinden biri yapmıştır.', bioEn: 'Bob Marley is the Jamaican musician who introduced reggae music to the world. His music carries themes of social justice, peace, and Rastafari spiritual tradition. Albums like Exodus, Natty Dread, and the Legend compilation made him one of the most important figures in music history.' } });
  const beethoven = await prisma.artist.create({ data: { slug: 'ludwig-van-beethoven', name: 'Ludwig van Beethoven', type: 'COMPOSER', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&q=80', bioTr: 'Ludwig van Beethoven, Klasik ve Romantik dönem arasında köprü kurmuş Alman besteci ve piyanisttir. İşitme kaybına rağmen bestelemeye devam etmesi, sanat tarihinin en ilham verici hikayelerinden biridir. 9 senfonisi, piyano sonatları ve yaylı çalgı dörtlüleri müzik edebiyatının temel taşlarıdır.', bioEn: 'Ludwig van Beethoven was a German composer and pianist who bridged the Classical and Romantic periods. His continued composing despite hearing loss is one of the most inspiring stories in art history. His 9 symphonies, piano sonatas, and string quartets are cornerstones of music literature.' } });
  const davidBowie = await prisma.artist.create({ data: { slug: 'david-bowie', name: 'David Bowie', type: 'SOLO', image: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600&q=80', bioTr: 'David Bowie, müziğin ötesinde bir kültür fenomenidir. Ziggy Stardust karakteriyle glam rock\'ın simgesi olmuş; ardından soul, electronic, art rock ve industrial türlerini keşfetmiştir. Sürekli dönüşümü ve kimlik arayışı, onu popüler kültürün en cesur sanatçılarından biri yapmıştır.', bioEn: 'David Bowie is a cultural phenomenon beyond music. He became the icon of glam rock with the Ziggy Stardust character; then explored soul, electronic, art rock, and industrial genres. His constant transformation and identity exploration made him one of the boldest artists in popular culture.' } });
  const kendrick = await prisma.artist.create({ data: { slug: 'kendrick-lamar', name: 'Kendrick Lamar', type: 'SOLO', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80', bioTr: 'Kendrick Lamar, 2010\'ların en önemli rap sanatçısıdır. Compton, Kaliforniya\'da doğan Lamar, good kid, m.A.A.d city ve To Pimp a Butterfly albümleriyle hem lirik derinlik hem de müzikal inovasyonun zirvesine ulaşmıştır. Pulitzer Ödülü kazanan ilk rap sanatçısıdır.', bioEn: 'Kendrick Lamar is the most important rap artist of the 2010s. Born in Compton, California, Lamar reached the pinnacle of both lyrical depth and musical innovation with albums good kid, m.A.A.d city and To Pimp a Butterfly. He is the first rap artist to win a Pulitzer Prize.' } });
  const kraftwerk = await prisma.artist.create({ data: { slug: 'kraftwerk', name: 'Kraftwerk', type: 'GROUP', image: 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=600&q=80', bioTr: 'Kraftwerk, 1970\'te Düsseldorf\'ta kurulan ve elektronik müziğin temellerini atan Alman grubudur. Autobahn, Trans-Europe Express ve The Man-Machine albümleriyle synth-pop, techno ve tüm elektronik müziğin öncüsü olmuşlardır.', bioEn: 'Kraftwerk is a German group founded in Düsseldorf in 1970 that laid the foundations of electronic music. With albums Autobahn, Trans-Europe Express, and The Man-Machine, they pioneered synth-pop, techno, and all electronic music.' } });
  const billie = await prisma.artist.create({ data: { slug: 'billie-holiday', name: 'Billie Holiday', type: 'SOLO', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80', bioTr: 'Billie Holiday, jazz vokalinin en özgün seslerinden biridir. Duygusal derinliği, özgün frazi̇ng tekniği ve acı dolu yaşam öyküsü, onu müzik tarihinin en etkileyici figürlerinden biri yapmıştır. "Strange Fruit" şarkısı toplumsal protestonun en güçlü müzikal ifadelerinden biri olarak kabul edilir.', bioEn: 'Billie Holiday is one of the most original voices in jazz vocal. Her emotional depth, unique phrasing technique, and painful life story made her one of the most compelling figures in music history. "Strange Fruit" is considered one of the most powerful musical expressions of social protest.' } });

  // Genre associations
  await prisma.artistGenre.createMany({ data: [
    { artistId: nirvana.id, genreId: rock.id }, { artistId: nirvana.id, genreId: grunge.id },
    { artistId: radiohead.id, genreId: rock.id }, { artistId: radiohead.id, genreId: altRock.id },
    { artistId: milesD.id, genreId: jazz.id }, { artistId: milesD.id, genreId: bebop.id },
    { artistId: pinkFloyd.id, genreId: rock.id }, { artistId: pinkFloyd.id, genreId: progRock.id },
    { artistId: bobMarley.id, genreId: reggae.id },
    { artistId: beethoven.id, genreId: classical.id },
    { artistId: davidBowie.id, genreId: rock.id }, { artistId: davidBowie.id, genreId: pop.id },
    { artistId: kendrick.id, genreId: rap.id },
    { artistId: kraftwerk.id, genreId: electronic.id },
    { artistId: billie.id, genreId: jazz.id }, { artistId: billie.id, genreId: blues.id },
  ]});
  console.log('Artists seeded');

  // ─── ALBUMS ───
  const nevermind = await prisma.album.create({ data: { slug: 'nevermind', title: 'Nevermind', artistId: nirvana.id, releaseDate: new Date('1991-09-24'), coverImage: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=500&q=80', descriptionTr: 'Nirvana\'nın 1991 tarihli ikinci stüdyo albümü. Grunge\'ı ana akıma taşıyan kırılma noktası.', descriptionEn: 'Nirvana\'s 1991 second studio album. The breaking point that brought grunge to the mainstream.' } });
  await prisma.song.createMany({ data: [
    { title: 'Smells Like Teen Spirit', albumId: nevermind.id, trackNumber: 1, duration: '5:01' },
    { title: 'In Bloom', albumId: nevermind.id, trackNumber: 2, duration: '4:14' },
    { title: 'Come as You Are', albumId: nevermind.id, trackNumber: 3, duration: '3:39' },
    { title: 'Lithium', albumId: nevermind.id, trackNumber: 5, duration: '4:17' },
    { title: 'Polly', albumId: nevermind.id, trackNumber: 6, duration: '2:57' },
    { title: 'Something in the Way', albumId: nevermind.id, trackNumber: 12, duration: '3:52', isDeepCut: true },
  ]});
  const inUtero = await prisma.album.create({ data: { slug: 'in-utero', title: 'In Utero', artistId: nirvana.id, releaseDate: new Date('1993-09-21'), coverImage: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80' } });
  await prisma.song.createMany({ data: [
    { title: 'Serve the Servants', albumId: inUtero.id, trackNumber: 1, duration: '3:36' },
    { title: 'Heart-Shaped Box', albumId: inUtero.id, trackNumber: 3, duration: '4:41' },
    { title: 'All Apologies', albumId: inUtero.id, trackNumber: 12, duration: '3:51' },
  ]});

  const okComputer = await prisma.album.create({ data: { slug: 'ok-computer', title: 'OK Computer', artistId: radiohead.id, releaseDate: new Date('1997-06-16'), coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&q=80', descriptionTr: 'Radiohead\'in üçüncü albümü. Modern yabancılaşma ve teknoloji kaygısını konu alan konsept albüm.', descriptionEn: 'Radiohead\'s third album. A concept album addressing modern alienation and technology anxiety.' } });
  await prisma.song.createMany({ data: [
    { title: 'Paranoid Android', albumId: okComputer.id, trackNumber: 2, duration: '6:23' },
    { title: 'Karma Police', albumId: okComputer.id, trackNumber: 6, duration: '4:21' },
    { title: 'No Surprises', albumId: okComputer.id, trackNumber: 9, duration: '3:48' },
    { title: 'Lucky', albumId: okComputer.id, trackNumber: 11, duration: '4:19', isDeepCut: true },
  ]});

  const amnesiac = await prisma.album.create({ data: { slug: 'amnesiac', title: 'Amnesiac', artistId: radiohead.id, releaseDate: new Date('2001-06-05'), coverImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&q=80' } });
  await prisma.song.createMany({ data: [
    { title: 'Pyramid Song', albumId: amnesiac.id, trackNumber: 2, duration: '4:49', isDeepCut: true },
    { title: 'Knives Out', albumId: amnesiac.id, trackNumber: 5, duration: '4:15' },
  ]});

  const kindOfBlue = await prisma.album.create({ data: { slug: 'kind-of-blue', title: 'Kind of Blue', artistId: milesD.id, releaseDate: new Date('1959-08-17'), coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=500&q=80', descriptionTr: 'Jazz tarihinin en etkili albümü. Modal jazz\'ın doğuşunu simgeler.', descriptionEn: 'The most influential album in jazz history. Symbolizes the birth of modal jazz.' } });
  await prisma.song.createMany({ data: [
    { title: 'So What', albumId: kindOfBlue.id, trackNumber: 1, duration: '9:22' },
    { title: 'Blue in Green', albumId: kindOfBlue.id, trackNumber: 3, duration: '5:27', isDeepCut: true },
    { title: 'All Blues', albumId: kindOfBlue.id, trackNumber: 4, duration: '11:33' },
  ]});

  const darkSide = await prisma.album.create({ data: { slug: 'the-dark-side-of-the-moon', title: 'The Dark Side of the Moon', artistId: pinkFloyd.id, releaseDate: new Date('1973-03-01'), coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' } });
  await prisma.song.createMany({ data: [
    { title: 'Time', albumId: darkSide.id, trackNumber: 4, duration: '6:53' },
    { title: 'Money', albumId: darkSide.id, trackNumber: 6, duration: '6:22' },
    { title: 'The Great Gig in the Sky', albumId: darkSide.id, trackNumber: 5, duration: '4:47', isDeepCut: true },
  ]});

  console.log('Albums & songs seeded');

  // ─── ARCHITECTS ───
  const subPop = await prisma.architect.create({ data: { slug: 'sub-pop-records', name: 'Sub Pop Records', type: 'RECORD_LABEL', image: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80', bioTr: 'Sub Pop, 1986\'da Seattle\'da kurulan bağımsız plak şirketidir. Grunge akımının doğuşunda ve yayılmasında kritik rol oynamıştır. Nirvana, Soundgarden ve Mudhoney gibi grupların ilk kayıtlarını yayımlamıştır.', bioEn: 'Sub Pop is an independent record label founded in Seattle in 1986. It played a critical role in the birth and spread of the grunge movement. It released early recordings of bands like Nirvana, Soundgarden, and Mudhoney.' } });
  const robertLang = await prisma.architect.create({ data: { slug: 'robert-lang-studios', name: 'Robert Lang Studios', type: 'STUDIO', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80', bioTr: 'Seattle sahnesi denince akla gelen en ikonik stüdyo. 1990\'ların başında kurulan bu stüdyo, Nirvana\'nın son stüdyo kayıtlarını yaptığı mekan olarak tarihsel bir sembole dönüşmüştür. Foo Fighters, Alice in Chains, Soundgarden ve Pearl Jam gibi gruplar burada kayıt yapmıştır.', bioEn: 'The most iconic studio associated with the Seattle scene. Founded in the early 1990s, this studio became a historical symbol as the location where Nirvana made their last studio recordings. Bands like Foo Fighters, Alice in Chains, Soundgarden, and Pearl Jam recorded here.' } });
  const butchVig = await prisma.architect.create({ data: { slug: 'butch-vig', name: 'Butch Vig', type: 'PRODUCER', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80', bioTr: 'Butch Vig, alternatif rock\'ın en önemli prodüktörlerinden biridir. Nirvana\'nın Nevermind albümünü prodüklemesiyle tanınır. Ayrıca Garbage grubunun kurucusudur.', bioEn: 'Butch Vig is one of the most important producers of alternative rock. Known for producing Nirvana\'s Nevermind album. He is also the founder of the band Garbage.' } });
  const blueNote = await prisma.architect.create({ data: { slug: 'blue-note-records', name: 'Blue Note Records', type: 'RECORD_LABEL', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80', bioTr: 'Blue Note Records, 1939\'da kurulan ve jazz müziğin en prestijli plak şirketidir. Miles Davis, John Coltrane, Thelonious Monk ve Art Blakey gibi devlerin albümlerini yayımlamıştır.', bioEn: 'Blue Note Records, founded in 1939, is the most prestigious record label in jazz music. It released albums by giants like Miles Davis, John Coltrane, Thelonious Monk, and Art Blakey.' } });
  const abbeyRoad = await prisma.architect.create({ data: { slug: 'abbey-road-studios', name: 'Abbey Road Studios', type: 'STUDIO', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&q=80', bioTr: 'Londra\'nın St John\'s Wood semtinde bulunan Abbey Road Studios, dünyanın en ünlü kayıt stüdyosudur. The Beatles\'ın neredeyse tüm albümlerini burada kaydetmesi, stüdyoyu bir kültür sembolüne dönüştürmüştür.', bioEn: 'Located in St John\'s Wood, London, Abbey Road Studios is the world\'s most famous recording studio. The Beatles recording nearly all their albums here transformed the studio into a cultural symbol.' } });

  await prisma.architectArtist.createMany({ data: [
    { architectId: subPop.id, artistId: nirvana.id, role: 'Early recordings' },
    { architectId: robertLang.id, artistId: nirvana.id, role: 'Final sessions' },
    { architectId: butchVig.id, artistId: nirvana.id, role: 'Nevermind producer' },
    { architectId: blueNote.id, artistId: milesD.id, role: 'Label' },
    { architectId: blueNote.id, artistId: billie.id, role: 'Label' },
    { architectId: abbeyRoad.id, artistId: pinkFloyd.id, role: 'Recording studio' },
    { architectId: abbeyRoad.id, artistId: radiohead.id, role: 'OK Computer sessions' },
  ]});
  console.log('Architects seeded');

  // ─── ARTICLES ───
  await prisma.article.create({ data: { slug: 'rock-genre-deep-dive', titleTr: 'Rock: Hatanın Sahiplenilmesi', titleEn: 'Rock: Embracing the Imperfection', contentTr: '<p>Rock bir patlamadır. 1940\'ların sonu, 50\'lerin başı. Amerika savaş sonrası yeni bir döneme giriyor. Televizyon evlere girmeye başlamış, gençlik ilk kez ayrı bir kimlik olarak görünür olmuş.</p><h2>Distortion\'ın Doğuşu</h2><p>Efsaneye göre bir gece bir gitar amfisi bozulur. Ses temiz çıkmaz, çatallar, kirlenir. O bozukluk atılmaz; sevilir. Çünkü o kirli ses daha gerçek gelir. <strong>Distortion bir hatadan doğar.</strong> Rock biraz da budur: Hatanın sahiplenilmesi.</p><h2>Kültürel Şok</h2><p>Chuck Berry gitarıyla sahnede yürürken müzik artık sadece dinlenen değil, izlenen bir şeye dönüşür. Elvis Presley kalçasını salladığında bu sadece dans değildir; bir kültürel şoktur.</p><h2>Evrim</h2><p>1960\'lara gelindiğinde rock büyür. İngiltere\'den The Beatles ve The Rolling Stones çıkar. 70\'lerde sertleşir, 80\'lerde parlatılır, 90\'larda grunge ile tekrar kirlenir. Çünkü rock\'ın özü temiz olmak değildir. <em>Tepki vermektir.</em></p>', contentEn: '<p>Rock is an explosion. Late 1940s, early 1950s. America is entering a new era after the war. Television is entering homes, and youth has become visible as a separate identity for the first time.</p><h2>Birth of Distortion</h2><p>Legend has it that one night a guitar amp breaks. The sound doesn\'t come out clean—it splits, it dirties. That defect isn\'t discarded; it\'s loved. Because that dirty sound feels more real. <strong>Distortion was born from a mistake.</strong></p><h2>Cultural Shock</h2><p>When Chuck Berry walked across the stage with his guitar, music became not just something listened to, but something watched. When Elvis shook his hips, it wasn\'t just dance—it was a cultural shock.</p><h2>Evolution</h2><p>By the 1960s, rock grew. The Beatles and The Rolling Stones emerged from England. In the 70s it hardened, in the 80s it was polished, in the 90s it got dirty again with grunge. Because the essence of rock isn\'t being clean. <em>It\'s reacting.</em></p>', category: 'GENRE', featuredImage: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-01-15'), relatedGenreId: rock.id } });

  await prisma.article.create({ data: { slug: 'grunge-seattle-story', titleTr: 'Grunge: Seattle\'ın Karanlık Sesi', titleEn: 'Grunge: The Dark Sound of Seattle', contentTr: '<p>Grunge, 1980\'lerin ortasında ABD\'nin Pasifik Kuzeybatısı\'nda, özellikle Seattle merkezli olarak doğmuş bir alt türdür.</p><h2>Coğrafi İzolasyon</h2><p>Coğrafi izolasyon, yağmurlu ve endüstriyel şehir atmosferi, müziğin karanlık ve içe dönük karakterini beslemiştir. Tür; punk\'ın ham enerjisini heavy metal\'in kalın, distortion\'lı gitar tonlarıyla birleştirir.</p><h2>Sub Pop ve Sahne</h2><p>Yerel sahnenin örgütlenmesinde <strong>Sub Pop</strong> önemli rol oynamıştır. Erken dönem öncüleri arasında Green River ve Melvins yer alırken; türü küresel ölçekte görünür kılan gruplar Soundgarden, Alice in Chains, Pearl Jam ve özellikle <strong>Nirvana</strong> olmuştur.</p><h2>Zirve ve Düşüş</h2><p>1991–1994 arası zirve dönemidir; ancak hızlı ticarileşme ve 1994\'te Kurt Cobain\'in ölümüyle birlikte akım zayıflamıştır. Buna rağmen grunge, alternatif rock üzerinde kalıcı bir kültürel etki bırakmıştır.</p>', contentEn: '<p>Grunge is a subgenre born in the mid-1980s in the Pacific Northwest, particularly Seattle.</p><h2>Geographic Isolation</h2><p>Geographic isolation, rainy and industrial city atmosphere nourished the dark and introverted character of the music. The genre combines punk\'s raw energy with heavy metal\'s thick, distorted guitar tones.</p><h2>Sub Pop and the Scene</h2><p><strong>Sub Pop</strong> played an important role in organizing the local scene. While early pioneers included Green River and Melvins, the groups that made the genre globally visible were Soundgarden, Alice in Chains, Pearl Jam, and especially <strong>Nirvana</strong>.</p><h2>Peak and Decline</h2><p>1991–1994 was the peak period; however, rapid commercialization and Kurt Cobain\'s death in 1994 weakened the movement. Despite this, grunge left a lasting cultural impact on alternative rock.</p>', category: 'GENRE', featuredImage: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-02-10'), relatedGenreId: grunge.id } });

  await prisma.article.create({ data: { slug: 'punk-fashion-dress-codes', titleTr: 'Punk: Moda ve Kıyafet Kodları', titleEn: 'Punk: Fashion & Dress Codes', contentTr: '<p>Punk yalnızca bir müzik türü değil, bilinçli bir görsel başkaldırıdır. 1970\'lerin ortasında hem New York City hem de London sahnesinde ortaya çıkan punk estetiği; sistem karşıtı, sınıf öfkesi taşıyan bir stil dili geliştirdi.</p><h2>DIY Kültürü</h2><p>Punk modasının temel kodu DIY\'dir. Yırtılmış tişörtler, elde dikilmiş yamalar, sprey boyayla yazılmış sloganlar. Kıyafet, satın alınan bir ürün değil; dönüştürülen bir ifade aracıdır.</p><h2>Deri Ceket & Güvenlik İğnesi</h2><p>Siyah deri ceket punk ikonografisinin merkezindedir. Güvenlik iğnesi hem işlevsel hem semboliktir: kopmuş bir şeyi saklamak yerine görünür kılmak.</p><h2>Vivienne Westwood Etkisi</h2><p>Vivienne Westwood ve Malcolm McLaren, Londra\'daki butik kültürü üzerinden punk estetiğini biçimlendirdi. Sahne ile moda arasında çift yönlü bir akış oluştu.</p>', contentEn: '<p>Punk is not just a music genre but a conscious visual rebellion. The punk aesthetic that emerged in the mid-1970s in both NYC and London developed a style language that was anti-system and carried class anger.</p><h2>DIY Culture</h2><p>The fundamental code of punk fashion is DIY. Ripped t-shirts, hand-sewn patches, spray-painted slogans. Clothing is not a purchased product; it\'s a transformed means of expression.</p><h2>Leather Jacket & Safety Pin</h2><p>The black leather jacket is at the center of punk iconography. The safety pin is both functional and symbolic: making visible what is broken rather than hiding it.</p><h2>Vivienne Westwood Effect</h2><p>Vivienne Westwood and Malcolm McLaren shaped punk aesthetics through London\'s boutique culture. A two-way flow was created between stage and fashion.</p>', category: 'FASHION', featuredImage: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-03-05'), relatedGenreId: punkRock.id } });

  await prisma.article.create({ data: { slug: 'pyramid-song-deep-cut', titleTr: 'Pyramid Song: Zamansız Bir Dalış', titleEn: 'Pyramid Song: A Timeless Dive', contentTr: '<p>Radiohead\'in 2001 tarihli Amnesiac dönemine ait "Pyramid Song", grubun en gizemli ve yapısal olarak en dikkat çekici parçalarından biridir.</p><h2>Ritmik Belirsizlik</h2><p>İlk dinleyişte ağır ve melankolik bir piyano baladı gibi duyulur; ancak şarkının asıl gücü ritmik belirsizliğinde yatar. Ölçü yapısı geleneksel akışın dışındadır.</p><h2>Tematik Derinlik</h2><p>Sözlerde ölüm, bilinç ve geçiş temaları öne çıkar. Adı Mısır mitolojisine gönderme yapsa da anlatı doğrudan mitolojik değildir; daha çok rüya ile gerçek arasında salınan bir bilinç hâlini tasvir eder.</p>', contentEn: '<p>Radiohead\'s "Pyramid Song" from the 2001 Amnesiac era is one of the band\'s most mysterious and structurally remarkable tracks.</p><h2>Rhythmic Ambiguity</h2><p>On first listen it sounds like a heavy, melancholic piano ballad; but the song\'s real power lies in its rhythmic ambiguity. The meter structure is outside conventional flow.</p><h2>Thematic Depth</h2><p>Themes of death, consciousness, and transition stand out in the lyrics. Although its name references Egyptian mythology, the narrative is not directly mythological; rather, it depicts a state of consciousness oscillating between dream and reality.</p>', category: 'DEEP_CUT', featuredImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-04-20'), relatedArtistId: radiohead.id } });

  await prisma.article.create({ data: { slug: 'modal-jazz-theory', titleTr: 'Modal Jazz: Harmonik Özgürleşme', titleEn: 'Modal Jazz: Harmonic Liberation', contentTr: '<p>Modal jazz, 1950\'lerin sonunda geleneksel akor progresyonlarına alternatif olarak ortaya çıkmış bir jazz yaklaşımıdır.</p><h2>Miles Davis ve Kind of Blue</h2><p>Miles Davis\'in 1959 tarihli Kind of Blue albümü, modal jazz\'ın manifestosudur. Şarkılar belirli akor dizileri yerine modlar (scales) üzerine kurulmuştur. Bu yaklaşım, soloculara daha geniş bir doğaçlama alanı tanımıştır.</p><h2>Etkileri</h2><p>Modal jazz; free jazz, fusion ve hatta ambient elektronik müzik üzerinde derin etki bırakmıştır. Harmonik düşüncenin "daha az akor, daha çok alan" prensibine dayanan bu yaklaşım, minimalizmin müzikteki ilk tezahürlerinden biri olarak değerlendirilir.</p>', contentEn: '<p>Modal jazz is a jazz approach that emerged in the late 1950s as an alternative to traditional chord progressions.</p><h2>Miles Davis and Kind of Blue</h2><p>Miles Davis\'s 1959 Kind of Blue album is the manifesto of modal jazz. Songs are built on modes (scales) rather than specific chord sequences. This approach gave soloists a wider space for improvisation.</p><h2>Influences</h2><p>Modal jazz had a deep influence on free jazz, fusion, and even ambient electronic music. This approach, based on the principle of "fewer chords, more space," is considered one of the first manifestations of minimalism in music.</p>', category: 'THEORY', featuredImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-05-12'), relatedGenreId: jazz.id, relatedArtistId: milesD.id } });

  await prisma.article.create({ data: { slug: 'ai-music-future', titleTr: 'Yapay Zeka ve Müziğin Geleceği', titleEn: 'AI and the Future of Music', contentTr: '<p>Algoritmik müzik üretimi, son birkaç yılda büyük bir sıçrama yaşadı. AI modelleri artık şarkı yazabiliyor, enstrüman çalabiliyor ve hatta prodüksiyon yapabiliyor.</p><h2>İnsan-Makine İşbirliği</h2><p>AI\'ın müzikteki rolü, insanın yerine geçmek değil; yaratıcı süreci genişletmektir. Brian Eno\'nun generatif müzik konseptinden Holly Herndon\'ın AI korosuna kadar, bu işbirliği yeni ifade biçimleri yaratıyor.</p><h2>Etik Sorular</h2><p>Telif hakları, sanatçı kimliği ve otantiklik kavramları yeniden sorgulanıyor. AI ürettiği müzik kimin eseridir? Bu sorular, müzik endüstrisinin gelecek on yılını şekillendirecek.</p>', contentEn: '<p>Algorithmic music production has made a huge leap in the past few years. AI models can now write songs, play instruments, and even produce.</p><h2>Human-Machine Collaboration</h2><p>AI\'s role in music is not to replace humans but to expand the creative process. From Brian Eno\'s generative music concept to Holly Herndon\'s AI choir, this collaboration creates new forms of expression.</p><h2>Ethical Questions</h2><p>Copyright, artist identity, and authenticity concepts are being questioned anew. Who owns AI-generated music? These questions will shape the next decade of the music industry.</p>', category: 'AI_MUSIC', featuredImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80', authorId: superAdmin.id, status: 'PUBLISHED', publishedAt: new Date('2024-06-01') } });

  console.log('Articles seeded');

  // ─── LISTENING PATHS ───
  await prisma.listeningPath.create({ data: { slug: 'melancholy-journey', titleTr: 'Melankolik Yolculuk', titleEn: 'Melancholy Journey', descriptionTr: 'Hüzünle güzelliğin kesiştiği duygu yoğun bir dinleme rotası. Sessizlikten patlamaya, kırılganlıktan kabullenişe.', descriptionEn: 'An emotionally intense listening route where sadness meets beauty. From silence to explosion, from fragility to acceptance.', type: 'EMOTION', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80' } });
  await prisma.listeningPath.create({ data: { slug: 'seattle-sound-1991', titleTr: 'Seattle Sesi: 1991', titleEn: 'The Seattle Sound: 1991', descriptionTr: 'Grunge patlamasının tam merkezinden bir dinleme deneyimi. Nevermind\'dan Ten\'e, Badmotorfinger\'dan Dirt\'e.', descriptionEn: 'A listening experience from the epicenter of the grunge explosion. From Nevermind to Ten, Badmotorfinger to Dirt.', type: 'CITY', image: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&q=80' } });
  await prisma.listeningPath.create({ data: { slug: 'jazz-after-midnight', titleTr: 'Gece Yarısından Sonra Jazz', titleEn: 'Jazz After Midnight', descriptionTr: 'Gece geç saatlerin atmosferini taşıyan, yumuşak ve derin bir jazz rotası. Cool jazz\'dan modal jazz\'a.', descriptionEn: 'A soft and deep jazz route carrying the atmosphere of late night hours. From cool jazz to modal jazz.', type: 'CONTRAST', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80' } });
  await prisma.listeningPath.create({ data: { slug: 'electronic-evolution', titleTr: 'Elektronik Evrimi', titleEn: 'Electronic Evolution', descriptionTr: 'Kraftwerk\'ten günümüz ambient sahnesine elektronik müziğin yolculuğu. Makinelerin müziğe dönüştüğü an.', descriptionEn: 'The journey of electronic music from Kraftwerk to today\'s ambient scene. The moment machines turned into music.', type: 'ERA', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80' } });
  await prisma.listeningPath.create({ data: { slug: 'first-steps-into-rock', titleTr: 'Rock\'a İlk Adımlar', titleEn: 'First Steps Into Rock', descriptionTr: 'Rock müziğe yeni başlayanlar için tasarlanmış bir giriş rotası. Chuck Berry\'den Nirvana\'ya temel taşları.', descriptionEn: 'An introductory route designed for newcomers to rock music. The cornerstones from Chuck Berry to Nirvana.', type: 'INTRO', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&q=80' } });

  console.log('Listening paths seeded');

  // ─── SITE SETTINGS ───
  const settings = [
    { key: 'hero_title_tr', value: 'BEYOND THE MUSIC' },
    { key: 'hero_title_en', value: 'BEYOND THE MUSIC' },
    { key: 'hero_subtitle_tr', value: 'Küratöryel Müzik Platformu' },
    { key: 'hero_subtitle_en', value: 'Curatorial Music Platform' },
    { key: 'hero_desc_tr', value: 'Müziğin ötesindeki kültürü keşfet.\nTürler, sanatçılar, hikayeler.\nBir arşiv. Bir atlas. Bir kürasyon.' },
    { key: 'hero_desc_en', value: 'Discover the culture beyond music.\nGenres, artists, stories.\nAn archive. An atlas. A curation.' },
    { key: 'hero_poster_url', value: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80' },
    { key: 'hero_cta_text_tr', value: 'Keşfet' },
    { key: 'hero_cta_text_en', value: 'Explore' },
    { key: 'hero_cta2_text_tr', value: 'Dinleme Rotaları' },
    { key: 'hero_cta2_text_en', value: 'Listening Paths' },
    { key: 'culture_banner_title_tr', value: 'Müzik Sadece\nDinlenmez.' },
    { key: 'culture_banner_title_en', value: 'Music Is Not\nJust Heard.' },
    { key: 'culture_banner_desc_tr', value: 'Giyilir, yaşanır, sahne alır, sokakta yürür. Beyond The Music, müziğin ötesindeki kültürü keşfeder.' },
    { key: 'culture_banner_desc_en', value: "It's worn, lived, staged, walked on the street. Beyond The Music explores the culture beyond music." },
    { key: 'culture_banner_image', value: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1920&q=80' },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log('Site settings seeded');

  // ─── HERO VIDEOS ───
  await prisma.heroVideo.deleteMany();
  await prisma.heroVideo.createMany({ data: [
    { url: 'https://assets.mixkit.co/videos/4841/4841-720.mp4', duration: 12, order: 0, isActive: true, title: 'Concert Lights' },
    { url: 'https://assets.mixkit.co/videos/1164/1164-720.mp4', duration: 10, order: 1, isActive: true, title: 'Concert Crowd' },
    { url: 'https://assets.mixkit.co/videos/647/647-720.mp4', duration: 10, order: 2, isActive: true, title: 'Stage Performance' },
  ]});
  console.log('Hero videos seeded');
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
