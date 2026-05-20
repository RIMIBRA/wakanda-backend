const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── ROUTE TEST ──
app.get('/', (req, res) => {
  res.json({ message: '✅ Serveur Wakanda opérationnel !' });
});

// ── ROUTES COMMANDES ──

// Créer une nouvelle commande
app.post('/api/commandes', (req, res) => {
  const { client_nom, client_telephone, type_commande,
          adresse_livraison, montant_total, mode_paiement,
          notes, articles } = req.body;

  const reference = 'WAKA-' + Math.floor(1000 + Math.random() * 9000);

  const sql = `INSERT INTO commandes 
    (reference, client_nom, client_telephone, type_commande, 
     adresse_livraison, montant_total, mode_paiement, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [reference, client_nom, client_telephone,
    type_commande, adresse_livraison, montant_total,
    mode_paiement, notes], (err, result) => {
    if (err) {
      console.error('❌ Erreur commande:', err);
      return res.status(500).json({ erreur: 'Erreur serveur' });
    }

    const commande_id = result.insertId;

    // Enregistrer les articles
    if (articles && articles.length > 0) {
      const detailsSql = `INSERT INTO commande_details 
        (commande_id, plat_id, plat_nom, plat_prix, quantite, sous_total) 
        VALUES ?`;

      const values = articles.map(a => [
        commande_id, a.plat_id, a.plat_nom,
        a.plat_prix, a.quantite, a.plat_prix * a.quantite
      ]);

      db.query(detailsSql, [values], (err2) => {
        if (err2) console.error('❌ Erreur détails:', err2);
      });
    }

    res.json({
      succes: true,
      reference: reference,
      commande_id: commande_id,
      message: 'Commande enregistrée avec succès !'
    });
  });
});

// Récupérer toutes les commandes (dashboard)
app.get('/api/commandes', (req, res) => {
  const sql = `SELECT * FROM commandes ORDER BY created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erreur: 'Erreur serveur' });
    res.json(results);
  });
});

// Changer le statut d'une commande
app.put('/api/commandes/:id/statut', (req, res) => {
  const { statut } = req.body;
  const sql = `UPDATE commandes SET statut = ? WHERE id = ?`;
  db.query(sql, [statut, req.params.id], (err) => {
    if (err) return res.status(500).json({ erreur: 'Erreur serveur' });
    res.json({ succes: true, message: 'Statut mis à jour !' });
  });
});

// ── ROUTES MENU ──

// Récupérer tous les plats
app.get('/api/plats', (req, res) => {
  const sql = `SELECT * FROM plats WHERE disponible = 1`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erreur: 'Erreur serveur' });
    res.json(results);
  });
});

// ── STATISTIQUES DASHBOARD ──
app.get('/api/stats', (req, res) => {
  const stats = {};

  // Total commandes aujourd'hui
  db.query(`SELECT COUNT(*) as total, SUM(montant_total) as revenus 
    FROM commandes WHERE DATE(created_at) = CURDATE()`,
    (err, result) => {
      stats.aujourd_hui = result[0];

      // Total commandes ce mois
      db.query(`SELECT COUNT(*) as total, SUM(montant_total) as revenus 
        FROM commandes WHERE MONTH(created_at) = MONTH(CURDATE())`,
        (err2, result2) => {
          stats.ce_mois = result2[0];

          // Plats les plus commandés
          db.query(`SELECT plat_nom, SUM(quantite) as total_vendu 
            FROM commande_details 
            GROUP BY plat_nom ORDER BY total_vendu DESC LIMIT 5`,
            (err3, result3) => {
              stats.top_plats = result3;

              // Paiements par méthode
              db.query(`SELECT mode_paiement, COUNT(*) as nombre 
                FROM commandes GROUP BY mode_paiement`,
                (err4, result4) => {
                  stats.paiements = result4;
                  res.json(stats);
                });
            });
        });
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur Wakanda démarré sur http://localhost:${PORT}`);
});