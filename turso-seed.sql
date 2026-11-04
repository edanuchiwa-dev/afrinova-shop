CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'Général',
        image_url TEXT,
        weight_kg REAL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , compare_at_price INTEGER DEFAULT NULL, cost_per_item INTEGER DEFAULT NULL, sku TEXT DEFAULT '', barcode TEXT DEFAULT '', track_quantity INTEGER DEFAULT 1, continue_selling_out_of_stock INTEGER DEFAULT 0, is_physical INTEGER DEFAULT 1, vendor TEXT DEFAULT '', tags TEXT DEFAULT '', seo_title TEXT DEFAULT '', seo_description TEXT DEFAULT '', media_urls TEXT DEFAULT '[]', variants TEXT DEFAULT '[]', sales_channels TEXT DEFAULT '["online_store","whatsapp","ads"]');
INSERT INTO products VALUES(1,'Montre Chronographe','montre-chronographe','Montre chronographe élégante pour le quotidien.',18900.0,8,'Montres','/images/products/montre-chronographe.jpg',0.5,'active','2026-10-24 15:00:18',NULL,NULL,'','',1,0,1,'','','','','[]','[]','["online_store","whatsapp","ads"]');
INSERT INTO products VALUES(2,'Sacoche Cuir','sacoche-cuir','Sacoche en cuir pratique et résistante.',12900.0,9,'Maroquinerie','/images/products/sacoche-cuir.jpg',0.5,'active','2026-10-24 15:00:18',NULL,NULL,'','',1,0,1,'','','','','[]','[]','["online_store","whatsapp","ads"]');
INSERT INTO products VALUES(3,'Casque Audio sans fil','casque-audio-sans-fil','Casque audio sans fil confortable.',14900.0,14,'Audio','/images/products/casque-audio.jpg',0.5,'active','2026-10-24 15:00:18',NULL,NULL,'','',1,0,1,'','','','','[]','[]','["online_store","whatsapp","ads"]');
INSERT INTO products VALUES(4,'Portefeuille RFID','portefeuille-rfid','Portefeuille avec protection RFID.',4900.0,18,'Maroquinerie','/images/products/portefeuille-rfid.jpg',0.5,'active','2026-10-24 15:00:18',NULL,NULL,'','',1,0,1,'','','','','[]','[]','["online_store","whatsapp","ads"]');
CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        shipping_city TEXT NOT NULL,
        shipping_postal_code TEXT NOT NULL,
        shipping_country TEXT NOT NULL DEFAULT 'France',
        carrier TEXT NOT NULL DEFAULT 'Colissimo',
        total_price REAL NOT NULL,
        shipping_cost REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'nouvelle',
        tracking_number TEXT DEFAULT '',
        customer_notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , utm_source TEXT DEFAULT '', utm_medium TEXT DEFAULT '', utm_campaign TEXT DEFAULT '', referrer TEXT DEFAULT '', neighborhood TEXT DEFAULT '', landmark TEXT DEFAULT '', location_url TEXT DEFAULT '', payment_method TEXT DEFAULT 'cod');
INSERT INTO orders VALUES(1,'CMD-20261024-6035','Antoine Martin',NULL,'0612345678','14 Avenue des Champs-Élysées','Paris','75008','France','Colissimo Domicile 48h (Gratuit)',18900.0,0.0,'expediee','6A9876543210FR','Laisser au gardien','2026-10-24 15:13:12','','','','','','','','cod');
INSERT INTO orders VALUES(2,'CMD-20261024-4452','Sophie Laurent',NULL,'0698765432','8 Rue de la République','Lyon','69002','France','Colissimo Domicile 48h (Gratuit)',12900.0,0.0,'nouvelle','','Appeler en arrivant','2026-10-24 16:13:57','','','','','','','','cod');
INSERT INTO orders VALUES(3,'CMD-20261024-4443','Marc Vasseur',NULL,'0655443322','25 Quai des Belges','Marseille','13001','France','Chronopost Express 24h',14900.0,0.0,'nouvelle','','Bureau au 2ème étage','2026-10-24 16:51:46','','','','','','','','cod');
INSERT INTO orders VALUES(4,'CMD-20261025-3953','Koffi Mensah',NULL,'0197001122','Quartier Haie Vive','Cotonou','','Bénin','Livraison Standard',37800.0,0.0,'annulee','','','2026-10-25 16:26:44','','','','','','','','cod');
INSERT INTO orders VALUES(5,'CMD-20261025-7406','Ablawa Dossou',NULL,'0196223344','Quartier Ganhi, face pharmacie','Cotonou','','Bénin','Livraison Standard',19900.0,1000.0,'nouvelle','','','2026-10-25 16:41:10','facebook','cpc','black_friday_2026','https://m.facebook.com','','','','cod');
INSERT INTO orders VALUES(6,'CMD-20261025-5272','Bio Séro',NULL,'+2290197123456','Albarika, Repère: Face entrée principale Université de Parakou','Parakou','','Bénin','Livraison express domicile',21900.0,3000.0,'nouvelle','','','2026-10-25 16:47:25','','','','','Albarika','Face entrée principale Université de Parakou','https://maps.google.com/?q=9.35,2.63','cod');
INSERT INTO orders VALUES(7,'CMD-20261026-1441','Bio Dossou',NULL,'+2290197223344','Livraison à Cotonou','Cotonou','','Bénin','Livraison express domicile',5900.0,1000.0,'nouvelle','','','2026-10-26 20:19:45','','','','','','','','cod');
INSERT INTO orders VALUES(8,'CMD-20261026-3559','Sèna Houénou',NULL,'+2290197008899','Livraison à Calavi Arconville','Calavi Arconville','','Bénin','Livraison express domicile',6400.0,1500.0,'nouvelle','','','2026-10-26 21:39:19','','','','','','','','cod');
INSERT INTO orders VALUES(11,'CMD-20261103-6618','Killer7',NULL,'+2290146482698','Livraison à Porto','Porto','','Bénin','Livraison directe à convenir avec le client',18900.0,0.0,'nouvelle','','','2026-11-03 20:48:01','','','','http://192.168.100.10:3000/admin?tab=analytics','','','','cod');
CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        product_price REAL NOT NULL,
        quantity INTEGER NOT NULL, promo_id INTEGER DEFAULT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
INSERT INTO order_items VALUES(1,1,1,'Montre Chronographe',18900.0,1,NULL);
INSERT INTO order_items VALUES(2,2,2,'Sacoche Cuir',12900.0,1,NULL);
INSERT INTO order_items VALUES(3,3,3,'Casque Audio sans fil',14900.0,1,NULL);
INSERT INTO order_items VALUES(4,4,1,'Montre Chronographe',18900.0,2,NULL);
INSERT INTO order_items VALUES(5,5,1,'Montre Chronographe',18900.0,1,NULL);
INSERT INTO order_items VALUES(6,6,1,'Montre Chronographe',18900.0,1,NULL);
INSERT INTO order_items VALUES(7,7,4,'Portefeuille RFID (Offre Promotionnelle)',4900.0,1,1);
INSERT INTO order_items VALUES(8,8,4,'Portefeuille RFID (Offre Promotionnelle)',4900.0,1,1);
INSERT INTO order_items VALUES(11,11,1,'Montre Chronographe',18900.0,1,NULL);
CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
INSERT INTO settings VALUES('qb_template','modern');
INSERT INTO settings VALUES('qb_accent_color','#C27835');
INSERT INTO settings VALUES('whatsapp_notify_enabled','1');
INSERT INTO settings VALUES('whatsapp_notify_phone','22942520869');
INSERT INTO settings VALUES('whatsapp_notify_provider','greenapi');
INSERT INTO settings VALUES('whatsapp_notify_apikey','93b228c99c2343a986da0f3e83f59dcfb370ef16c281404192');
INSERT INTO settings VALUES('whatsapp_notify_template','🚨 *NOUVELLE COMMANDE REÇUE !*

📦 *Commande :* {order_number}
👤 *Client :* {customer_name}
📞 *Téléphone :* {customer_phone}
📍 *Ville :* {shipping_city}
🏡 *Quartier / Repère :* {neighborhood} {landmark}

🛍️ *Articles :*
{items}

💰 *Total à encaisser :* {total_price} FCFA
🚚 *Livraison :* {shipping_cost} FCFA
💳 *Paiement :* {payment_method}
📝 *Note :* {notes}
📅 *Date :* {date}

🔗 *Gérer la commande :* {admin_url}');
INSERT INTO settings VALUES('whatsapp_notify_last_status','Message WhatsApp transmis via Green-API (ID: 3EB075A1FC9B9C522ED55C)');
INSERT INTO settings VALUES('whatsapp_notify_id_instance','710722790086');
INSERT INTO settings VALUES('whatsapp_notify_last_sent_at','2026-11-03T20:48:02.536Z');
INSERT INTO settings VALUES('whatsapp_notify_webhook_url','');
CREATE TABLE IF NOT EXISTS whatsapp_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      caption TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'actif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      original_price INTEGER NOT NULL,
      promo_price INTEGER NOT NULL,
      total_quota INTEGER NOT NULL,
      consumed_quota INTEGER NOT NULL DEFAULT 0,
      reserved_quota INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      show_remaining INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
INSERT INTO promotions VALUES(1,4,'Offre Spéciale — Quantité Limitée',6100,4900,12,2,0,NULL,NULL,'active',1,'2026-10-26 20:19:31');
CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      path TEXT NOT NULL,
      title TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device_type TEXT DEFAULT 'mobile',
      city TEXT DEFAULT 'Cotonou',
      country TEXT DEFAULT 'Bénin',
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
    , ip_address TEXT DEFAULT '', region TEXT DEFAULT 'Littoral', isp TEXT DEFAULT '', latitude REAL DEFAULT NULL, longitude REAL DEFAULT NULL, user_agent TEXT DEFAULT '', browser TEXT DEFAULT '');
INSERT INTO page_views VALUES(859,'sess_e6wjvb5n_mw0bl7za','/','Atelier Pro — Boutique Exclusive Bénin','http://localhost:3000/admin?tab=products','','','','desktop','Localhost','Local',NULL,'2026-11-03 06:41:50','2026-11-03 06:43:06','127.0.0.1 (Localhost / Test)','Réseau local','Réseau Local (Développement)',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(860,'sess_e6wjvb5n_mw0bl7za','/','Atelier Pro — Boutique Exclusive Bénin','http://localhost:3000/admin?tab=products','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 14:06:43','2026-11-03 14:06:43','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(861,'sess_e6wjvb5n_mw0bl7za','/produit/montre-chronographe','','http://localhost:3000/admin?tab=products','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 14:06:58','2026-11-03 14:16:58','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(862,'sess_e6wjvb5n_mw0bl7za','/produit/montre-chronographe','Atelier Pro — Boutique Exclusive Bénin','http://localhost:3000/admin?tab=products','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 14:17:06','2026-11-03 14:22:07','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(863,'sess_e6wjvb5n_mw0bl7za','/','Atelier Pro — Boutique Exclusive Bénin','http://localhost:3000/admin?tab=products','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 14:22:24','2026-11-03 14:22:24','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(864,'sess_e6wjvb5n_mw0bl7za','/produit/casque-audio-sans-fil','','http://localhost:3000/admin?tab=products','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 14:22:38','2026-11-03 15:19:24','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(865,'sess_h974os0q_mw0bb72f','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 20:19:10','2026-11-03 20:30:54','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(866,'sess_h974os0q_mw0bb72f','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 20:30:55','2026-11-03 20:33:01','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(867,'sess_h974os0q_mw0bb72f','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Non localisée','Bénin',NULL,'2026-11-03 20:33:19','2026-11-03 20:36:37','137.255.180.154','Littoral','Fournisseur d''Accès Inconnu',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(868,'sess_h974os0q_mw0bb72f','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 20:36:47','2026-11-03 21:14:30','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(869,'sess_wh6zny6o_mw15fplo','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Localhost','Local',NULL,'2026-11-03 20:37:23','2026-11-03 20:37:23','192.168.100.10 (Réseau Local)','Réseau local','Réseau Local (Développement)',NULL,NULL,'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36','Google Chrome');
INSERT INTO page_views VALUES(870,'sess_wqqa0963_mw15i641','/','Atelier Pro — Boutique Exclusive Bénin','http://192.168.100.10:3000/','','','','mobile','Localhost','Local',NULL,'2026-11-03 20:39:17','2026-11-03 20:39:42','192.168.100.12 (Réseau Local)','Réseau local','Réseau Local (Développement)',NULL,NULL,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36','Chrome Mobile');
INSERT INTO page_views VALUES(871,'sess_qbl4qb7k_mw15s02n','/','Atelier Pro — Boutique Exclusive Bénin','http://192.168.100.10:3000/admin?tab=analytics','','','','mobile','Localhost','Local',NULL,'2026-11-03 20:46:56','2026-11-03 20:46:56','192.168.100.12 (Réseau Local)','Réseau local','Réseau Local (Développement)',NULL,NULL,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36','Chrome Mobile');
INSERT INTO page_views VALUES(872,'sess_qbl4qb7k_mw15s02n','/produit/montre-chronographe','','http://192.168.100.10:3000/admin?tab=analytics','','','','mobile','Cotonou','Bénin',NULL,'2026-11-03 20:47:01','2026-11-03 20:48:42','137.255.75.167','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36','Chrome Mobile');
INSERT INTO page_views VALUES(873,'sess_h974os0q_mw0bb72f','/','Atelier Pro — Boutique Exclusive Bénin','','','','','desktop','Cotonou','Bénin',NULL,'2026-11-03 21:14:52','2026-11-03 21:14:52','137.255.180.154','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','Firefox');
INSERT INTO page_views VALUES(874,'sess_my14acnb_mw18hxgi','/produit/montre-chronographe','Atelier Pro — Boutique Exclusive Bénin','http://192.168.100.10:3000/admin?tab=analytics','','','','mobile','Localhost','Local',NULL,'2026-11-03 22:03:05','2026-11-03 22:03:05','192.168.100.12 (Réseau Local)','Réseau local','Réseau Local (Développement)',NULL,NULL,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36','Chrome Mobile');
INSERT INTO page_views VALUES(875,'sess_my14acnb_mw18hxgi','/','Atelier Pro — Boutique Exclusive Bénin','http://192.168.100.10:3000/admin?tab=analytics','','','','mobile','Cotonou','Bénin',NULL,'2026-11-03 22:03:12','2026-11-03 22:03:12','137.255.75.167','Littoral','Celtiis / SBIN',6.3669,2.4151,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36','Chrome Mobile');
CREATE TABLE IF NOT EXISTS "reviews" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER DEFAULT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    customer_name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Cotonou',
    comment TEXT NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'en_attente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );
INSERT INTO reviews VALUES(58,NULL,5,'Arnaud D.','Cotonou','Articles bien finis et conformes aux photos, livraison rapide sur Cotonou.',NULL,'approuve','2026-11-02 14:20:00');
INSERT INTO reviews VALUES(59,NULL,5,'Boris K.','Abomey-Calavi','Le coursier m''a laissé ouvrir le colis pour vérifier avant de régler en espèces.',NULL,'approuve','2026-10-31 11:45:00');
INSERT INTO reviews VALUES(60,NULL,5,'Chantal A.','Porto-Novo','Commande reçue le lendemain à Porto-Novo dans un emballage très propre.',NULL,'approuve','2026-10-28 16:30:00');
INSERT INTO reviews VALUES(61,NULL,4,'Hermann T.','Cotonou','Boutique sérieuse, juste un petit retard de livraison dû aux embouteillages.',NULL,'approuve','2026-10-24 18:10:00');
INSERT INTO reviews VALUES(62,NULL,5,'Ulrich S.','Parakou','Expédition sécurisée jusqu''à Parakou, colis bien protégé et intact.',NULL,'approuve','2026-10-20 09:30:00');
INSERT INTO reviews VALUES(63,NULL,5,'Serge G.','Cotonou','Très bonne sélection de produits, le service client WhatsApp répond vite.',NULL,'approuve','2026-10-18 17:15:00');
INSERT INTO reviews VALUES(64,NULL,5,'Gildas A.','Abomey-Calavi','Paiement à la livraison sans prise de tête, commande traitée en quelques heures.',NULL,'approuve','2026-10-14 15:40:00');
INSERT INTO reviews VALUES(65,NULL,5,'Gloria M.','Cotonou','Deuxième commande chez AFRINOVA SHOP et toujours aussi satisfaite de la qualité.',NULL,'approuve','2026-10-10 12:20:00');
INSERT INTO reviews VALUES(66,NULL,4,'Wilfried B.','Porto-Novo','Articles solides et bien présentés, commerçant courtois au téléphone.',NULL,'approuve','2026-10-06 10:05:00');
INSERT INTO reviews VALUES(67,NULL,5,'Blandine T.','Ouidah','Livraison soignée jusqu''à Ouidah, échange fluide avec le service commercial.',NULL,'approuve','2026-10-02 14:50:00');
INSERT INTO reviews VALUES(68,NULL,5,'Lionel K.','Cotonou','Achat en ligne simple et sans carte bancaire, je recommande cette boutique.',NULL,'approuve','2026-09-28 20:30:00');
INSERT INTO reviews VALUES(69,NULL,5,'Aimé H.','Cotonou','Qualité au rendez-vous et respect des délais annoncés.',NULL,'approuve','2026-09-24 15:50:00');

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_promotions_product_status ON promotions(product_id, status);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_heartbeat ON page_views(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_ip ON page_views(ip_address);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
