-- Zelfora: mock data (building phase only)
-- Fills the database with a demo mockup:
--   1. demo customer accounts (they can't sign in: they have no password)
--   2. photos and opening hours for the five demo restaurants
--   3. full menus for the five demo restaurants
--   4. four weeks of orders from the demo customers at every published
--      restaurant with a menu, plus orders in progress right now at open
--      restaurants that have an owner, so the portal has work to do
--
-- Re-running it replaces the demo menus and all orders placed by demo
-- customers, with dates relative to now. Other data is left alone. Never run
-- this once Zelfora has real customers.
--
-- Run it in the Supabase SQL Editor or through the supabase-write MCP server:
-- it inserts into auth.users, and it switches off the validate_order trigger
-- while inserting orders (the trigger would reset their dates and statuses).
-- It all runs as one transaction.
--
-- The demo restaurants are found by name (their ids are random), so the
-- script stops with an error if one was renamed or removed.
--
-- Photos are links to Unsplash (images.unsplash.com) and TheMealDB
-- (www.themealdb.com). Drinks and some dishes have no photo on purpose, as
-- on a real menu.
--
-- To remove the demo customers and their orders:
--   delete from public.orders where user_id in (select id from auth.users where raw_user_meta_data->>'demo' = 'true');
--   delete from public.profiles where id in (select id from auth.users where raw_user_meta_data->>'demo' = 'true');
--   delete from auth.users where raw_user_meta_data->>'demo' = 'true';

-- Helpers for this session only.
create or replace function pg_temp.unsplash(photo text, size text default 'w=600&h=600')
returns text language sql immutable as $$
  select 'https://images.unsplash.com/photo-' || photo || '?auto=format&fit=crop&' || size || '&q=80'
$$;

create or replace function pg_temp.mealdb(file text)
returns text language sql immutable as $$
  select 'https://www.themealdb.com/images/media/meals/' || file || '.jpg'
$$;

-- The id of a demo restaurant; fails unless exactly one has this name.
create or replace function pg_temp.restaurant_id(p_name text)
returns uuid language plpgsql stable as $$
declare
  found_id uuid;
begin
  select id into strict found_id from public.restaurants where name = p_name;
  return found_id;
exception
  when no_data_found or too_many_rows then
    raise exception 'Expected one demo restaurant named "%"', p_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Demo customers
--    Their name, phone number, address and how often they order (weight) are
--    in raw_user_meta_data. The on_auth_user_created trigger adds their
--    profiles rows.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  c.email, '', now() - interval '60 days',
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('demo', true, 'full_name', c.name, 'phone', c.phone, 'address', c.address, 'weight', c.weight),
  now() - interval '60 days', now(), '', '', '', ''
from (values
  ('demo.sanne@zelfora.test',  'Sanne de Jong',    '06 1234 5601', 'Overtoom 112-2, 1054 HN Amsterdam',            5),
  ('demo.daan@zelfora.test',   'Daan Visser',      '06 1234 5602', 'Van Woustraat 45-3, 1074 AD Amsterdam',        4),
  ('demo.emma@zelfora.test',   'Emma Bakker',      '06 1234 5603', 'Kinkerstraat 210-1, 1053 EH Amsterdam',        3),
  ('demo.lucas@zelfora.test',  'Lucas Smit',       '06 1234 5604', 'Ceintuurbaan 88-H, 1072 GC Amsterdam',         3),
  ('demo.julia@zelfora.test',  'Julia Meijer',     '06 1234 5605', 'Admiraal de Ruijterweg 301, 1055 LZ Amsterdam', 2),
  ('demo.milan@zelfora.test',  'Milan de Boer',    '06 1234 5606', 'Javaplein 14-2, 1095 CJ Amsterdam',            4),
  ('demo.tess@zelfora.test',   'Tess Mulder',      '06 1234 5607', 'Bilderdijkstraat 150-3, 1053 LB Amsterdam',    2),
  ('demo.noah@zelfora.test',   'Noah Jansen',      '06 1234 5608', 'Wibautstraat 77, 1091 GK Amsterdam',           3),
  ('demo.fleur@zelfora.test',  'Fleur van Dijk',   '06 1234 5609', 'Haarlemmerdijk 54-1, 1013 JE Amsterdam',       2),
  ('demo.sem@zelfora.test',    'Sem Hendriks',     '06 1234 5610', 'Rijnstraat 190-2, 1079 HP Amsterdam',          1),
  ('demo.lotte@zelfora.test',  'Lotte Vermeulen',  '06 1234 5611', 'Linnaeusstraat 33-3, 1093 EH Amsterdam',       2),
  ('demo.ayoub@zelfora.test',  'Ayoub El Idrissi', '06 1234 5612', 'Molukkenstraat 102, 1098 TC Amsterdam',        3),
  ('demo.priya@zelfora.test',  'Priya Sharma',     '06 1234 5613', 'Amstelveenseweg 400-1, 1076 CT Amsterdam',     2),
  ('demo.bram@zelfora.test',   'Bram de Wit',      '06 1234 5614', 'Dapperstraat 18-2, 1093 BT Amsterdam',         1)
) as c(email, name, phone, address, weight)
where not exists (select 1 from auth.users u where u.email = c.email);

-- ---------------------------------------------------------------------------
-- 2. Demo restaurants: photos and opening hours
--    Sushi Hana only opens in the evening and Taco Fiesta at noon, so some
--    restaurants show as closed during the day.
-- ---------------------------------------------------------------------------

update public.restaurants as r
set image = pg_temp.unsplash(d.photo, 'w=1600&h=900'),
    opening_hours = d.hours::jsonb,
    accepting_orders = true
from (values
  ('The Burger Club', '1551782450-a2132b4ba21d',
   '{"1": ["11:00", "23:00"], "2": ["11:00", "23:00"], "3": ["11:00", "23:00"], "4": ["11:00", "23:00"], "5": ["11:00", "01:00"], "6": ["11:00", "01:00"], "7": ["12:00", "23:00"]}'),
  ('Sushi Hana', '1611143669185-af224c5e3252',
   '{"2": ["16:00", "22:30"], "3": ["16:00", "22:30"], "4": ["16:00", "22:30"], "5": ["16:00", "23:00"], "6": ["16:00", "23:00"], "7": ["16:00", "22:00"]}'),
  ('Pizzeria da Luigi', '1513104890138-7c749659a591',
   '{"1": ["11:30", "23:00"], "2": ["11:30", "23:00"], "3": ["11:30", "23:00"], "4": ["11:30", "23:00"], "5": ["11:30", "23:30"], "6": ["11:30", "23:30"], "7": ["12:00", "22:30"]}'),
  ('Green Bowl', '1600335895229-6e75511892c8',
   '{"1": ["10:00", "21:00"], "2": ["10:00", "21:00"], "3": ["10:00", "21:00"], "4": ["10:00", "21:00"], "5": ["10:00", "21:00"], "6": ["11:00", "20:00"], "7": ["11:00", "20:00"]}'),
  ('Taco Fiesta', '1565299585323-38d6b0865b47',
   '{"1": ["12:00", "23:00"], "2": ["12:00", "23:00"], "3": ["12:00", "23:00"], "4": ["12:00", "23:00"], "5": ["12:00", "01:00"], "6": ["12:00", "01:00"], "7": ["12:00", "22:00"]}')
) as d(name, photo, hours)
where r.id = pg_temp.restaurant_id(d.name);

-- ---------------------------------------------------------------------------
-- 3. Demo menus
--    Past orders keep their own copy of each dish, so replacing the menus
--    doesn't affect them.
-- ---------------------------------------------------------------------------

delete from public.menu_items
where restaurant_id in (
  pg_temp.restaurant_id('The Burger Club'), pg_temp.restaurant_id('Sushi Hana'),
  pg_temp.restaurant_id('Pizzeria da Luigi'), pg_temp.restaurant_id('Green Bowl'),
  pg_temp.restaurant_id('Taco Fiesta')
);

-- The Burger Club
insert into public.menu_items (restaurant_id, position, category, name, description, price, image)
select pg_temp.restaurant_id('The Burger Club'), v.* from (values
  (1,  'Burgers', 'Classic Cheese', 'Sappige rundvleesburger met cheddar, augurk, ui en onze geheime saus.', 12.50, pg_temp.unsplash('1568901346375-23c9450c58cd')),
  (2,  'Burgers', 'Double Smash', 'Twee dun geslagen burgers met dubbel cheddar, gekarameliseerde ui en smash-saus.', 15.50, pg_temp.unsplash('1572802419224-296b0aeee0d9')),
  (3,  'Burgers', 'Bacon BBQ', 'Rundvleesburger met krokant spek, cheddar, uienringen en smokey barbecuesaus.', 14.95, pg_temp.unsplash('1586190848861-99aa4a171e90')),
  (4,  'Burgers', 'Truffle Deluxe', 'Black angus burger met truffelmayo, rucola, oude kaas en gebakken paddenstoelen.', 16.95, pg_temp.unsplash('1553979459-d2229ba7433b')),
  (5,  'Burgers', 'Pickle Monster', 'Dubbele burger met extra augurk, American cheese, mosterd en ketchup.', 14.50, pg_temp.unsplash('1607013251379-e6eecfffe234')),
  (6,  'Burgers', 'Avocado Crunch', 'Rundvleesburger met avocado, tomaat, rode ui en limoenmayo.', 13.95, pg_temp.unsplash('1520072959219-c595dc870360')),
  (7,  'Burgers', 'Veggie Beyond', 'Plantaardige burger met vegan cheddar, sla, tomaat en vegan mayo.', 13.50, pg_temp.unsplash('1571091718767-18b5b1457add')),
  (8,  'Kip & snacks', 'Crispy Chicken', 'Krokante kipfilet met milde chilimayonaise en sla.', 11.95, pg_temp.mealdb('vdwloy1713225718')),
  (9,  'Kip & snacks', 'Chicken Tenders (5 stuks)', 'Krokante kipreepjes met honing-mosterddip.', 8.95, pg_temp.unsplash('1562967914-608f82629710')),
  (10, 'Kip & snacks', 'Buffalo Wings (8 stuks)', 'Pittige kippenvleugels met blue cheese-dip en selderij.', 9.50, pg_temp.unsplash('1608039755401-742074f0548d')),
  (11, 'Kip & snacks', 'Sticky BBQ Wings (8 stuks)', 'Kippenvleugels in zoete barbecueglaze met sesam.', 9.50, pg_temp.unsplash('1527477396000-e27163b481c2')),
  (12, 'Kip & snacks', 'Loaded Hot Dog', 'Rundvleesworst in een briochebroodje met chili, cheddar en jalapeños.', 7.95, pg_temp.unsplash('1619740455993-9e612b1af08a')),
  (13, 'Bijgerechten', 'Portie Friet', 'Krokante frietjes met keuze uit huisgemaakte sauzen.', 4.00, pg_temp.unsplash('1573080496219-bb080dd4f877')),
  (14, 'Bijgerechten', 'Truffelfriet', 'Friet met truffelmayo, Parmezaanse kaas en peterselie.', 5.95, pg_temp.unsplash('1630384060421-cb20d0e0649d')),
  (15, 'Bijgerechten', 'Cheesy Bacon Fries', 'Friet met cheddarsaus, spekjes en lente-ui.', 6.95, pg_temp.unsplash('1576107232684-1279f390859f')),
  (16, 'Bijgerechten', 'Uienringen (8 stuks)', 'Krokant gefrituurde uienringen met chipotle-mayo.', 4.95, pg_temp.unsplash('1639024471283-03518883512d')),
  (17, 'Bijgerechten', 'Coleslaw', 'Huisgemaakte romige koolsalade.', 3.50, null),
  (18, 'Desserts & shakes', 'Oreo Milkshake', 'Vanille-ijs geblend met Oreo en slagroom.', 5.95, pg_temp.unsplash('1572490122747-3968b75cc699')),
  (19, 'Desserts & shakes', 'Aardbeien Milkshake', 'Met verse aardbeien en vanille-ijs.', 5.95, pg_temp.unsplash('1579954115545-a95591f28bfc')),
  (20, 'Desserts & shakes', 'Chocolate Brownie', 'Warme brownie met een bolletje vanille-ijs.', 5.50, pg_temp.mealdb('yypvst1511386427')),
  (21, 'Desserts & shakes', 'Caramel Sundae', 'Vanille-ijs met karamelsaus, slagroom en pecannoten.', 4.95, pg_temp.unsplash('1563805042-7684c019e1cb')),
  (22, 'Dranken', 'Coca-Cola (33 cl)', null, 2.75, null),
  (23, 'Dranken', 'Coca-Cola Zero (33 cl)', null, 2.75, null),
  (24, 'Dranken', 'Fanta Orange (33 cl)', null, 2.75, null),
  (25, 'Dranken', 'Spa Blauw (50 cl)', null, 2.50, null),
  (26, 'Dranken', 'Huisgemaakte limonade', 'Citroen, munt en een vleugje gember.', 3.95, null)
) as v(position, category, name, description, price, image);

-- Sushi Hana
insert into public.menu_items (restaurant_id, position, category, name, description, price, image)
select pg_temp.restaurant_id('Sushi Hana'), v.* from (values
  (1,  'Voorgerechten', 'Miso Soep', 'Traditionele Japanse misosoep met tofu en wakame.', 3.50, null),
  (2,  'Voorgerechten', 'Edamame', 'Gestoomde sojabonen met zeezout.', 4.50, null),
  (3,  'Voorgerechten', 'Gyoza (6 stuks)', 'Gebakken dumplings met kip en groente, met ponzudip.', 6.50, pg_temp.unsplash('1496116218417-1a781b1c416c')),
  (4,  'Voorgerechten', 'Chicken Karaage', 'Japanse gefrituurde kip met kewpie-mayo en citroen.', 7.50, pg_temp.mealdb('tyywsw1505930373')),
  (5,  'Voorgerechten', 'Wakame Salade', 'Zeewiersalade met sesam en komkommer.', 4.95, null),
  (6,  'Maki & rolls', 'Spicy Tuna Roll', 'Tonijn, avocado, komkommer met pittige mayonaise.', 9.00, pg_temp.unsplash('1607301406259-dfb186e15de8')),
  (7,  'Maki & rolls', 'California Roll (8 stuks)', 'Surimi, avocado, komkommer en tobiko.', 8.50, pg_temp.unsplash('1579871494447-9811cf80d66c')),
  (8,  'Maki & rolls', 'Dragon Roll (8 stuks)', 'Ebi tempura en komkommer, bedekt met avocado en unagisaus.', 13.50, pg_temp.unsplash('1553621042-f6e147245754')),
  (9,  'Maki & rolls', 'Crispy Ebi Roll (8 stuks)', 'Gefrituurde garnaal, avocado en spicy mayo.', 11.50, null),
  (10, 'Maki & rolls', 'Veggie Roll (8 stuks)', 'Avocado, komkommer, wortel en sesam.', 7.50, null),
  (11, 'Nigiri & sashimi', 'Sake Nigiri (2 stuks)', 'Verse zalm op sushirijst.', 5.50, pg_temp.unsplash('1583623025817-d180a2221d0a')),
  (12, 'Nigiri & sashimi', 'Maguro Nigiri (2 stuks)', 'Tonijn op sushirijst.', 6.50, pg_temp.unsplash('1617196034796-73dfa7b1fd56')),
  (13, 'Nigiri & sashimi', 'Sashimi Mix (12 stuks)', 'Zalm, tonijn en geelstaart, dun gesneden.', 19.50, pg_temp.unsplash('1562802378-063ec186a863')),
  (14, 'Sushiboxen', 'Salmon Box (12 stuks)', '6 Sake Maki, 4 Salmon Nigiri, 2 Salmon Sashimi.', 18.50, pg_temp.mealdb('g046bb1663960946')),
  (15, 'Sushiboxen', 'Hana Mix Box (24 stuks)', 'Een mix van maki, rolls en nigiri van de chef, voor twee personen.', 34.50, pg_temp.unsplash('1611143669185-af224c5e3252')),
  (16, 'Warme gerechten', 'Chicken Katsu Curry', 'Krokante kipfilet met Japanse curry en rijst.', 14.50, pg_temp.mealdb('vwrpps1503068729')),
  (17, 'Warme gerechten', 'Teriyaki Zalm', 'Gegrilde zalm met teriyakisaus, rijst en groenten.', 16.50, pg_temp.mealdb('xxyupu1468262513')),
  (18, 'Warme gerechten', 'Yaki Udon', 'Gewokte udonnoedels met kip, groente en bonito.', 13.50, pg_temp.mealdb('wrustq1511475474')),
  (19, 'Warme gerechten', 'Tonkotsu Ramen', 'Romige varkensbouillon met chashu, ei, nori en lente-ui.', 15.50, pg_temp.unsplash('1569718212165-3a8278d5f624')),
  (20, 'Warme gerechten', 'Witte rijst', 'Een portie gestoomde Japanse rijst.', 3.00, pg_temp.mealdb('kw92t41604181871')),
  (21, 'Desserts', 'Mochi-ijs (3 stuks)', 'Matcha, mango en aardbei.', 5.95, null),
  (22, 'Dranken', 'Groene thee', null, 2.95, null),
  (23, 'Dranken', 'Ramune', 'Japanse limonade met een knikker in de fles.', 3.50, null),
  (24, 'Dranken', 'Asahi 0.0 (33 cl)', null, 3.75, null)
) as v(position, category, name, description, price, image);

-- Pizzeria da Luigi
insert into public.menu_items (restaurant_id, position, category, name, description, price, image)
select pg_temp.restaurant_id('Pizzeria da Luigi'), v.* from (values
  (1,  'Antipasti', 'Bruschetta', 'Geroosterd brood met tomaat, knoflook en olijfolie.', 6.50, pg_temp.unsplash('1572695157366-5e585ab2b69f')),
  (2,  'Antipasti', 'Bruschetta Burrata', 'Geroosterd brood met burrata, cherrytomaat en basilicumolie.', 8.95, pg_temp.unsplash('1506280754576-f6fa8a873550')),
  (3,  'Antipasti', 'Focaccia al Rosmarino', 'Huisgebakken focaccia met rozemarijn en zeezout.', 5.50, null),
  (4,  'Antipasti', 'Arancini (3 stuks)', 'Gefrituurde risottoballetjes met mozzarella en tomatensaus.', 7.50, null),
  (5,  'Pizza', 'Pizza Margherita', 'Verse tomatensaus, mozzarella en verse basilicum.', 9.50, pg_temp.unsplash('1574071318508-1cdbab80d002')),
  (6,  'Pizza', 'Pizza Picante', 'Tomatensaus, mozzarella en pittige Italiaanse salami.', 13.00, pg_temp.unsplash('1628840042765-356cda07504e')),
  (7,  'Pizza', 'Pizza Quattro Formaggi', 'Mozzarella, gorgonzola, taleggio en Parmezaanse kaas.', 13.50, pg_temp.unsplash('1595708684082-a173bb3a06c5')),
  (8,  'Pizza', 'Pizza Prosciutto e Rucola', 'Parmaham, rucola, burrata en Parmezaanse kaas.', 14.95, pg_temp.unsplash('1593560708920-61dd98c46a4e')),
  (9,  'Pizza', 'Pizza Diavola', 'Pittige salami, rode peper, rode ui en paprika.', 13.50, pg_temp.unsplash('1565299624946-b28f40a0ae38')),
  (10, 'Pizza', 'Pizza Salame', 'Tomatensaus, mozzarella en Italiaanse salami.', 12.00, pg_temp.unsplash('1604382354936-07c5d9983bd3')),
  (11, 'Pizza', 'Pizza Funghi', 'Champignons, mozzarella, knoflook en tijm.', 11.50, pg_temp.unsplash('1571407970349-bc81e7e96d47')),
  (12, 'Pizza', 'Pizza Tonno', 'Tonijn, rode ui, kappertjes en olijven.', 12.95, null),
  (13, 'Pizza', 'Calzone', 'Dichtgeklapte pizza met ham, champignons en ricotta.', 13.95, null),
  (14, 'Pasta', 'Spaghetti Carbonara', 'Met guanciale, eidooier, pecorino en zwarte peper.', 13.50, pg_temp.mealdb('llcbn01574260722')),
  (15, 'Pasta', 'Penne all''Arrabbiata', 'Pittige tomatensaus met knoflook en peterselie.', 11.50, pg_temp.unsplash('1621996346565-e3dbc646d9a9')),
  (16, 'Pasta', 'Lasagne della Casa', 'Huisgemaakte lasagne met rundergehakt en bechamel.', 14.50, pg_temp.mealdb('wtsvxx1511296896')),
  (17, 'Pasta', 'Spaghetti Bolognese', 'Langzaam gegaarde ragù van rund.', 12.95, pg_temp.mealdb('sutysw1468247559')),
  (18, 'Dolci', 'Tiramisu', 'Huisgemaakt met mascarpone, espresso en cacao.', 6.50, pg_temp.unsplash('1571877227200-a0d98ea607e9')),
  (19, 'Dolci', 'Panna Cotta', 'Met aardbeiencoulis.', 5.95, pg_temp.unsplash('1488477181946-6428a0291777')),
  (20, 'Dolci', 'Gelato (2 bolletjes)', 'Pistache, stracciatella of citroen.', 4.50, pg_temp.unsplash('1501443762994-82bd5dace89a')),
  (21, 'Bevande', 'San Pellegrino (50 cl)', null, 3.25, null),
  (22, 'Bevande', 'Aranciata (33 cl)', null, 2.95, null),
  (23, 'Bevande', 'Chinotto (33 cl)', null, 2.95, null),
  (24, 'Bevande', 'Birra Moretti 0.0 (33 cl)', null, 3.75, null)
) as v(position, category, name, description, price, image);

-- Green Bowl
insert into public.menu_items (restaurant_id, position, category, name, description, price, image)
select pg_temp.restaurant_id('Green Bowl'), v.* from (values
  (1,  'Bowls', 'Buddha Bowl', 'Quinoa, avocado, kikkererwten, geroosterde groenten en tahin.', 11.00, pg_temp.unsplash('1512621776951-a57141f2eefd')),
  (2,  'Bowls', 'Poké Bowl Zalm', 'Sushirijst, zalm, edamame, mango, rode kool en sesamdressing.', 13.50, pg_temp.unsplash('1546069901-ba9599a7e63c')),
  (3,  'Bowls', 'Tofu Poké Bowl', 'Gemarineerde tofu, ei, mais, komkommer en rode kool.', 12.00, pg_temp.unsplash('1546069901-d5bfd2cbfb1f')),
  (4,  'Bowls', 'Korean Bibimbap', 'Rijst met groenten, gebakken ei en gochujangsaus.', 12.95, pg_temp.unsplash('1590301157890-4810ed352733')),
  (5,  'Bowls', 'Quinoa Avocado Bowl', 'Quinoa, avocado, kikkererwten, cherrytomaat en citroen-tahin.', 11.95, pg_temp.unsplash('1623428187969-5da2dcea5ebf')),
  (6,  'Bowls', 'Falafel Bowl', 'Falafel, hummus, couscous, tabouleh en muntyoghurt.', 11.50, pg_temp.mealdb('u5e9qq1763795441')),
  (7,  'Salades', 'Caesar Salade', 'Romaine sla, gegrilde kip, Parmezaan en huisgemaakte dressing.', 9.50, pg_temp.unsplash('1550304943-4f24f54ddde9')),
  (8,  'Salades', 'Griekse Quinoasalade', 'Kip, quinoa, feta, komkommer, olijven en tomaat.', 11.50, pg_temp.mealdb('k29viq1585565980')),
  (9,  'Salades', 'Zalm-avocadosalade', 'Gegrilde zalm, avocado, rucola en limoendressing.', 12.50, pg_temp.mealdb('1549542994')),
  (10, 'Salades', 'Granaatappelsalade', 'Spinazie, avocado, granaatappel, walnoot en feta.', 10.50, pg_temp.unsplash('1511690743698-d9d85f2fbf38')),
  (11, 'Salades', 'Rainbow Salade', 'Radijs, wortel, rode kool, komkommer en kiemgroente.', 9.95, pg_temp.unsplash('1540420773420-3366772f4999')),
  (12, 'Wraps & rolls', 'Verse Vietnamese loempia''s (4 stuks)', 'Rijstpapier met groenten, munt en pindadip.', 7.95, pg_temp.unsplash('1600850056064-a8b380df8395')),
  (13, 'Wraps & rolls', 'Kip-avocadowrap', 'Volkorenwrap met gegrilde kip, avocado en yoghurt-limoensaus.', 9.50, pg_temp.unsplash('1626700051175-6818013e1d4f')),
  (14, 'Wraps & rolls', 'Falafel Pita', 'Pita met falafel, tahin, rode kool en tomaat.', 8.95, pg_temp.mealdb('ae6clc1760524712')),
  (15, 'Soepen', 'Tomatensoep', 'Romige tomatensoep met basilicum en zuurdesembrood.', 5.95, pg_temp.mealdb('stpuws1511191310')),
  (16, 'Soepen', 'Thaise pompoensoep', 'Met kokosmelk, rode curry en koriander.', 6.50, pg_temp.mealdb('1brbso1763585098')),
  (17, 'Smoothies & sappen', 'Mango Smoothie', 'Mango, yoghurt, banaan en een vleugje kardemom.', 5.50, pg_temp.mealdb('pjbaq11784731571')),
  (18, 'Smoothies & sappen', 'Berry Blast', 'Blauwe bes, framboos, aardbei en banaan.', 5.50, pg_temp.unsplash('1553530666-ba11a7da3888')),
  (19, 'Smoothies & sappen', 'Strawberry Dream', 'Aardbei, kokosmelk en vanille.', 5.50, pg_temp.unsplash('1502741224143-90386d7f8c82')),
  (20, 'Smoothies & sappen', 'Green Detox', 'Spinazie, appel, komkommer, gember en citroen.', 5.95, null),
  (21, 'Smoothies & sappen', 'Verse jus d''orange (30 cl)', null, 4.50, null),
  (22, 'Zoet', 'Chocolade-avocadomousse', 'Vegan mousse van avocado, cacao en dadel.', 4.95, pg_temp.mealdb('uttuxy1511382180')),
  (23, 'Zoet', 'Yoghurt met granola', 'Griekse yoghurt, huisgemaakte granola en honing.', 4.50, null)
) as v(position, category, name, description, price, image);

-- Taco Fiesta
insert into public.menu_items (restaurant_id, position, category, name, description, price, image)
select pg_temp.restaurant_id('Taco Fiesta'), v.* from (values
  (1,  'Snacks', 'Nachos Grande', 'Tortillachips met kaas, jalapeños, pico de gallo, zure room en guacamole.', 9.50, pg_temp.unsplash('1582169296194-e4d644c48063')),
  (2,  'Snacks', 'Loaded Nachos', 'Met pulled pork, cheddarsaus en chipotle-mayo.', 11.50, pg_temp.unsplash('1513456852971-30c0b8199d4d')),
  (3,  'Snacks', 'Guacamole & chips', 'Verse guacamole met huisgemaakte tortillachips.', 6.50, null),
  (4,  'Snacks', 'Elote', 'Gegrilde maiskolf met limoenmayo, kaas en chili.', 4.95, pg_temp.mealdb('k1if4d1782589892')),
  (5,  'Tacos', 'Tacos al Pastor (3 stuks)', 'Gemarineerd varkensvlees, ananas, koriander en ui.', 10.50, pg_temp.unsplash('1552332386-f8dd00dc2f85')),
  (6,  'Tacos', 'Fish Tacos (3 stuks)', 'Cajun-gekruide vis, rode kool, mango en limoenmayo.', 11.95, pg_temp.mealdb('uvuyxu1503067369')),
  (7,  'Tacos', 'Birria Tacos (3 stuks)', 'Langzaam gegaard rundvlees met kaas en bouillon om in te dippen.', 12.95, pg_temp.unsplash('1599974579688-8dbdd335c77f')),
  (8,  'Tacos', 'Carnitas Tacos (3 stuks)', 'Pulled pork met ui, koriander en salsa verde.', 10.95, pg_temp.unsplash('1551504734-5ee1c4a1479b')),
  (9,  'Tacos', 'Veggie Tacos (3 stuks)', 'Zwarte bonen, geroosterde zoete aardappel, avocado en feta.', 9.95, pg_temp.unsplash('1565299585323-38d6b0865b47')),
  (10, 'Burrito''s & quesadilla''s', 'Burrito Supreme', 'Rijst, bonen, kaas, guacamole en gegrild vlees naar keuze.', 12.00, pg_temp.unsplash('1566740933430-b5e70b06d2d5')),
  (11, 'Burrito''s & quesadilla''s', 'Chicken Burrito', 'Gegrilde kip, rijst, zwarte bonen, kaas en salsa roja.', 11.50, null),
  (12, 'Burrito''s & quesadilla''s', 'Quesadilla Queso', 'Gegrilde tortilla met drie soorten kaas en pico de gallo.', 8.50, pg_temp.unsplash('1618040996337-56904b7850b9')),
  (13, 'Burrito''s & quesadilla''s', 'Burrito Bowl', 'Alles van de burrito in een bowl, zonder tortilla.', 12.50, null),
  (14, 'Hoofdgerechten', 'Chili con Carne', 'Pittige stoof van rundvlees en bonen met rijst en zure room.', 13.50, pg_temp.mealdb('uuqvwu1504629254')),
  (15, 'Hoofdgerechten', 'Chicken Enchiladas', 'Tortilla''s gevuld met kip, uit de oven met salsa en kaas.', 14.50, pg_temp.mealdb('qtuwxu1468233098')),
  (16, 'Hoofdgerechten', 'Veggie Fajitas', 'Kikkererwten, paprika en ui van de plaat met tortilla''s.', 13.50, pg_temp.mealdb('tvtxpq1511464705')),
  (17, 'Hoofdgerechten', 'Gevulde paprika', 'Paprika gevuld met quinoa, zwarte bonen en kaas.', 12.50, pg_temp.mealdb('b66myb1683207208')),
  (18, 'Desserts', 'Churros', 'Met kaneelsuiker en chocoladesaus.', 5.95, pg_temp.mealdb('erzs951763296201')),
  (19, 'Desserts', 'Tres Leches', 'Luchtige cake gedrenkt in drie soorten melk.', 5.50, null),
  (20, 'Dranken', 'Horchata', 'Rijstmelk met kaneel en vanille.', 3.95, null),
  (21, 'Dranken', 'Jarritos Mandarijn', null, 3.25, null),
  (22, 'Dranken', 'Corona 0.0 (33 cl)', null, 3.75, null),
  (23, 'Dranken', 'Agua de Jamaica', 'IJsthee van hibiscusbloemen.', 3.50, null)
) as v(position, category, name, description, price, image);

-- A few dishes are sold out today.
update public.menu_items set available = false
where (restaurant_id, name) in (
  (pg_temp.restaurant_id('The Burger Club'), 'Truffle Deluxe'),
  (pg_temp.restaurant_id('Sushi Hana'), 'Dragon Roll (8 stuks)')
);

-- ---------------------------------------------------------------------------
-- 4. Orders
-- ---------------------------------------------------------------------------

-- A random moment on the given day, weighted towards lunch and (mostly)
-- dinner, within the restaurant's opening hours. Null if none was found,
-- for example because the restaurant is closed that day.
create or replace function pg_temp.random_time(p_hours jsonb, p_day date)
returns timestamptz language plpgsql as $$
declare
  pool      int[] := array[11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 17, 17, 18, 18, 18, 18, 18,
                           19, 19, 19, 19, 19, 20, 20, 20, 21, 21, 22];
  candidate timestamptz;
begin
  for attempt in 1..30 loop
    candidate := (p_day + make_time(pool[1 + floor(random() * array_length(pool, 1))::int],
                                    floor(random() * 60)::int, floor(random() * 60)))
                 at time zone 'Europe/Amsterdam';
    if public.is_within_opening_hours(p_hours, candidate) then
      return candidate;
    end if;
  end loop;
  return null;
end;
$$;

-- A demo customer, favouring the ones with a higher weight.
create or replace function pg_temp.random_customer()
returns uuid language sql as $$
  select id from auth.users
  where raw_user_meta_data->>'demo' = 'true'
  order by -ln(1 - random()) / (raw_user_meta_data->>'weight')::numeric
  limit 1
$$;

-- One order: 1 to 4 different dishes, sometimes a drink, and the customer's
-- details from raw_user_meta_data (or p_details). Every dish has a fixed
-- popularity from 1 to 5 (derived from its name), so some become bestsellers.
create or replace function pg_temp.mock_order(
  p_restaurant uuid, p_customer uuid, p_created timestamptz, p_status text, p_details jsonb default null
) returns void language plpgsql as $$
declare
  roll        float8 := random();
  dishes      int := case when roll < 0.25 then 1 when roll < 0.65 then 2 when roll < 0.9 then 3 else 4 end;
  with_drink  boolean := random() < 0.4;
  in_progress boolean := p_status in ('placed', 'preparing', 'delivering');
  drinks      text[] := array['Dranken', 'Bevande'];
  notes       text[] := array[
    'Graag niet aanbellen, de baby slaapt.',
    'Bel even als je voor de deur staat.',
    'Derde verdieping, de lift is kapot.',
    'Extra servetjes graag!',
    'Zonder ui alsjeblieft.',
    'Allergisch voor noten.',
    'Bestek is niet nodig.',
    'Achterom via het steegje, groene deur.',
    'Saus apart graag.',
    'Het is voor een verjaardag!'
  ];
  details     jsonb := p_details;
  items       jsonb;
  subtotal    numeric;
  fee         numeric;
begin
  if p_created is null then
    return;
  end if;
  if details is null then
    select raw_user_meta_data into details from auth.users where id = p_customer;
  end if;

  select jsonb_agg(jsonb_build_object('menu_item_id', d.id, 'name', d.name, 'price', d.price, 'quantity', d.quantity)),
         sum(d.price * d.quantity)
    into items, subtotal
  from (
    (select m.id, m.name, m.price,
            case when random() < 0.75 then 1 when random() < 0.8 then 2 else 3 end as quantity
     from public.menu_items m
     where m.restaurant_id = p_restaurant
       and (m.available or not in_progress)
       and m.category <> all (drinks)
     order by -ln(1 - random()) / (1 + abs(hashtext(m.name)::bigint) % 5)
     limit dishes)
    union all
    (select m.id, m.name, m.price, case when random() < 0.7 then 1 else 2 end
     from public.menu_items m
     where with_drink
       and m.restaurant_id = p_restaurant
       and m.available
       and m.category = any (drinks)
     order by random()
     limit 1)
  ) d;
  if items is null then
    return;
  end if;

  select r.delivery_fee into fee from public.restaurants r where r.id = p_restaurant;

  insert into public.orders (
    user_id, restaurant_id, items, total, delivery_fee, status, created_at,
    customer_name, phone, delivery_address, note
  ) values (
    p_customer, p_restaurant, items, subtotal + fee, fee, p_status, p_created,
    details->>'full_name', details->>'phone', details->>'address',
    case when random() < 0.15 then notes[1 + floor(random() * array_length(notes, 1))::int] end
  );
end;
$$;

delete from public.orders
where user_id in (select id from auth.users where raw_user_meta_data->>'demo' = 'true');

alter table public.orders disable trigger validate_order;

do $$
declare
  restaurant public.restaurants;
  today      date := (now() at time zone 'Europe/Amsterdam')::date;
  weekday    int;
  base       numeric;
  per_day    int;
  created    timestamptz;
begin
  for restaurant in
    select r.* from public.restaurants r
    where r.published and exists (select 1 from public.menu_items m where m.restaurant_id = r.id)
  loop
    -- Orders per day: the burger place is busiest, weekends are busier, and
    -- business has grown over the four weeks.
    base := case restaurant.name
      when 'The Burger Club' then 5
      when 'Pizzeria da Luigi' then 4
      else 3
    end;
    for days_ago in 0..27 loop
      weekday := extract(isodow from today - days_ago);
      per_day := round(base
        * case when weekday >= 5 then 1.5 else 1 end
        * (1 - days_ago / 27.0 * 0.3)
        * (0.6 + random() * 0.8));
      for i in 1..per_day loop
        created := pg_temp.random_time(restaurant.opening_hours, today - days_ago);
        -- The last hour is for the orders in progress below.
        continue when created is null or created > now() - interval '1 hour';
        perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), created,
          case when random() < 0.07 then 'cancelled' else 'delivered' end);
      end loop;
    end loop;

    -- Orders in progress right now, for the owner to handle in the portal.
    if restaurant.owner_id is not null and public.is_open(restaurant) then
      perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), now() - interval '2 minutes', 'placed');
      perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), now() - interval '7 minutes', 'placed');
      perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), now() - interval '15 minutes', 'preparing');
      perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), now() - interval '22 minutes', 'preparing');
      perform pg_temp.mock_order(restaurant.id, pg_temp.random_customer(), now() - interval '34 minutes', 'delivering');
    end if;
  end loop;
end;
$$;

alter table public.orders enable trigger validate_order;
