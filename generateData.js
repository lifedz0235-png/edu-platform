import fs from "fs";

let id = 1;

function makeCourses(list, basePath) {
  return list.map(file => ({
    id: id++,
    title: file.replace(".mp4", "").replace(/-/g, " "),
    video: basePath + file
  }));
}

const data = [
  {
    category: "biologie",
    modules: [
      {
        name: "anatomopathologie",
        courses: makeCourses([
          "les-metastases.mp4",
          "classification-des-tumeurs.mp4",
          "processus-inflammatoire.mp4",
          "les-amyloses-congestion.mp4",
          "aterosclerose.mp4",
          "la-cellule-cancereuse.mp4",
          "atelier.mp4"
        ], "/videos/biologie/anatomopathologie/")
      },
      {
        name: "biochimie",
        courses: makeCourses([
          "metabolisme-des-glucides.mp4",
          "glycemie.mp4",
          "metabolisme-des-lipides.mp4",
          "metabolisme-phospho-calcique.mp4",
          "metabolisme-de-fer.mp4",
          "metabolisme-des-proteines.mp4",
          "metabolisme-des-acides-gras.mp4",
          "equilibre-acide-base.mp4",
          "atelier-1.mp4",
          "atelier-2.mp4"
        ], "/videos/biologie/biochimie/")
      },
      {
        name: "genetique",
        courses: makeCourses([
          "le-gene.mp4",
          "le-gene-suite.mp4",
          "genetique-mendelienne.mp4",
          "atelier-genetique.mp4"
        ], "/videos/biologie/genetique/")
      },
      {
        name: "histologie-embriologie",
        courses: makeCourses([
          "a-seance-orientation.mp4",
          "b-appareil-genital-feminin.mp4",
          "c-appareil-genital-masculin.mp4",
          "d-la-glande-surrenale.mp4",
          "e-la-thyroide.mp4",
          "f-hypophyse.mp4",
          "j-tissu-musculaire.mp4",
          "h-appareil-cardio-circulatoire.mp4",
          "k-oreille.mp4",
          "l-oeil.mp4"
        ], "/videos/biologie/histologie-embriologie/")
      },
      {
        name: "immunologie",
        courses: makeCourses([
          "a-seance-orientation.mp4",
          "b-immunologie-innee-a-immunologie-specifique.mp4",
          "c-les-immunoglobulines.mp4",
          "d-le-systeme-de-complement.mp4",
          "e-le-systeme-hla.mp4",
          "f-rimc.mp4",
          "j-les-etats-hypersensibilite.mp4",
          "h-les-etats-hypersensibilites-suite.mp4",
          "atelier-immunologie.mp4",
          "atelier-immunologie-suite.mp4"
        ], "/videos/biologie/immunologie/")
      },
      {
        name: "microbiologie",
        courses: makeCourses([
          "seance-orientation-microbiologie.mp4",
          "les-micro-organismes.mp4",
          "les-micro-organismes-1.mp4",
          "les-micro-organismes-2.mp4",
          "prelevements.mp4",
          "diagnostique-virologique.mp4",
          "atelier-immunologie.mp4"
        ], "/videos/biologie/microbiologie/")
      },
      {
        name: "neurophysiologie",
        courses: makeCourses([
          "influx-nerveux.mp4",
          "physiologie-du-systeme-nerveux-autonome.mp4",
          "physiologie-du-muscle-strie.mp4",
          "atelier-neurophysiologie.mp4"
        ], "/videos/biologie/neurophysiologie/")
      },
      {
        name: "physiologie",
        courses: makeCourses([
          "seance-orientation-physiologie.mp4",
          "hemodynamique-intra-cardiaque.mp4",
          "le-debit-cardiaque.mp4",
          "les-compartiments-liquidienne.mp4",
          "les-compartiments-liquidienne-suite.mp4",
          "pression-arteriel-et-sa-regulation.mp4",
          "equilibre-acido-basique.mp4",
          "equilibre-acido-basique-qcm.mp4",
          "les-etats-de-choc.mp4",
          "physiologie-respiratoire.mp4",
          "la-ventilation-respiratoire.mp4",
          "le-ventilation-alveolaire.mp4",
          "atelier-physiologie.mp4"
        ], "/videos/biologie/physiologie/")
      }
    ]
  },

  {
    category: "chirurgie",
    modules: [
      {
        name: "cci",
        courses: makeCourses([
          "les-occlusions-neonatale.mp4",
          "atresie-de-oesophage.mp4",
          "lch.mp4",
          "osteomyelite.mp4",
          "atelier-cci.mp4"
        ], "/videos/chirurgie/cci/")
      },
      {
        name: "chirurgie-generale",
        courses: makeCourses([
          "seance-orientation-chirurgie-generale.mp4",
          "appendicite-aigue-peritonite-aigue.mp4",
          "hernie-parietale-hemorragie-digestive.mp4",
          "lv-pancreatite-aigue.mp4",
          "syndrome-occlusif.mp4",
          "tumeur-oesophage.mp4",
          "cancer-pancreas-voies-biliaires.mp4",
          "cancer-colo-rectal.mp4",
          "ischemie-des-membres-inferieurs-brulures.mp4",
          "khf.mp4",
          "atelier-chirurgie-generale.mp4"
        ], "/videos/chirurgie/chirurgie-generale/")
      },
      {
        name: "gynecologie",
        courses: makeCourses([
          "geu-fibrome-uterin.mp4",
          "hta-et-grossesse.mp4",
          "hemorragie-de-la-delivrance.mp4",
          "cancer-du-col-uterin.mp4",
          "tumeurs-de-l-ovaire.mp4",
          "cancer-du-sein.mp4",
          "placenta-praevia.mp4",
          "atelier-gynecologie.mp4"
        ], "/videos/chirurgie/gynecologie/")
      },
      {
        name: "neurochirurgie",
        courses: makeCourses([
          "hic.mp4",
          "hemorragie-meningee.mp4",
          "hed.mp4",
          "atelier-neurochirurgie.mp4",
          "atelier-neurochirurgie-suite.mp4"
        ], "/videos/chirurgie/neurochirurgie/")
      },
      {
        name: "ophtalmologie",
        courses: makeCourses([
          "les-glaucomes.mp4",
          "cataracte.mp4",
          "atelier-ophtalmologie.mp4"
        ], "/videos/chirurgie/ophtalmologie/")
      },
      {
        name: "orl",
        courses: makeCourses([
          "otite-moyenne-aigue.mp4",
          "maladie-de-meniere.mp4",
          "anatomie-naso-sinusienne.mp4",
          "cancer-de-larynx.mp4",
          "cancer-de-cavum.mp4",
          "atelier-ORL.mp4"
        ], "/videos/chirurgie/orl/")
      },
      {
        name: "traumatologie",
        courses: makeCourses([
          "luxation-traumatique-de-la-hanche.mp4",
          "fracture-de-col-de-femure.mp4",
          "fracture-de-jambe.mp4",
          "polytrauma.mp4",
          "tumeurs-osseuses.mp4",
          "atelier-traumatologie.mp4"
        ], "/videos/chirurgie/traumatologie/")
      },
      {
        name: "urologie",
        courses: makeCourses([
          "a-adenome-de-prostate.mp4",
          "b-cancer-de-prostate.mp4",
          "c-cancer-de-vessie.mp4",
          "c-cancer-de-vessie-suite.mp4",
          "d-tumeurs-de-rein.mp4",
          "e-cancer-des-testicules.mp4",
          "f-retention-aigue-des-urines.mp4",
          "atelier-urologie.mp4"
        ], "/videos/chirurgie/urologie/")
      }
    ]
  },

  {
    category: "medicale",
    modules: [
      {
        name: "cardiologie",
        courses: makeCourses([
          "pericardite-aigue.mp4",
          "insuffisance-mitrale.mp4",
          "retrecissement-aortique.mp4",
          "insuffisance-aortique.mp4",
          "endocardite-infectieuse.mp4",
          "oap.mp4",
          "embolie-pulmonaire.mp4",
          "tvp.mp4",
          "sca.mp4",
          "atelier-cardiologie.mp4",
          "atelier-cardiologie-1mp4",
          "atelier-cardiologie-2.mp4"
        ], "/videos/medicale/cardiologie/")
      },
      {
        name: "dermatologie",
        courses: makeCourses([
          "psoriasis.mp4",
          "les-eczemas.mp4",
          "les-mycoses-cutanees.mp4",
          "les-infections-bacteriennes.mp4",
          "la-tuberculose-cutanee.mp4",
          "les-ist.mp4",
          "atelier-dermatologie.mp4"
        ], "/videos/medicale/dermatologie/")
      },
      {
        name: "endocrinologie",
        courses: makeCourses([
          "tumeur-hypophysaire.mp4",
          "hyperthyroidie.mp4",
          "insuffisance-surrenale.mp4",
          "diabete-et-ses-complications.mp4",
          "complication-du-diabete.mp4"
        ], "/videos/medicale/endocrinologie/")
      },
      {
        name: "epidemiologie",
        courses: makeCourses([
          "les-differents-indicateurs-de-sante.mp4",
          "epidemiologie-des-maladies-transmissible-et-non-transmissible.mp4",
          "vaccination.mp4",
          "atelier-epidemiologie.mp4"
        ], "/videos/medicale/epidemiologie/")
      },
      {
        name: "gastrologie",
        courses: makeCourses([
          "cirrhose-hepatique.mp4",
          "ascite.mp4",
          "pancreatite-chronique.mp4",
          "ictere.mp4",
          "hepatite-c-et-b.mp4",
          "ulcer-gastro-duodinale.mp4",
          "mici.mp4",
          "digestion-absorption.mp4",
          "secretion-biliaire.mp4",
          "atelier-gastrologie.mp4",
          "atelier-gastrologie-1.mp4",
          "atelier-gastrologie-2.mp4",
          "atelier-gastrologie-3.mp4"
        ], "/videos/medicale/gastrologie/")
      },
      {
        name: "hematologie",
        courses: makeCourses([
          "anemie.mp4",
          "anemie-suite.mp4",
          "cat-devant-une-anemie.mp4",
          "cat-devant-une-anemie-suite.mp4",
          "groupe-sanguin-et-transfusion.mp4",
          "hemostase-primaire-coagulation.mp4",
          "purpura-thrombopenique-immunologique.mp4",
          "lymphome-malin.mp4",
          "llc.mp4",
          "adp-spmg.mp4",
          "atelier-hematologie.mp4",
          "atelier-hematologie-1.mp4"
        ], "/videos/medicale/hematologie/")
      },
      {
        name: "infectieux",
        courses: makeCourses([
          "la-brucelose.mp4",
          "fievre-thyphoide.mp4",
          "les-meningites.mp4",
          "hiv-sida.mp4",
          "paludisme.mp4",
          "diarrhee-aigue-infectieuse.mp4",
          "diarrhee-aigue-infectieuse-suite.mp4",
          "atelier-infectiologie.mp4"
        ], "/videos/medicale/infectieux/")
      },
      {
        name: "medecine-de-travail",
        courses: makeCourses([
          "intoxication-aux-metaux-lourds.mp4",
          "accidents-de-travail.mp4",
          "atelier-medecine-de-travail.mp4"
        ], "/videos/medicale/medecine-de-travail/")
      },
      {
        name: "medecine-legale",
        courses: makeCourses([
          "diagnostique-de-la-mort.mp4",
          "secret-medical-responsabilite-medicale.mp4",
          "atelier-medecine-legale.mp4"
        ], "/videos/medicale/medecine-legale/")
      },
      {
        name: "nephrologie",
        courses: makeCourses([
          "insuffisance-renale-chronique.mp4",
          "insuffisance-renale-aigue.mp4",
          "syndrome-nephretique.mp4",
          "syndrome-nephretique-aigue.mp4",
          "syndrome-nephrotique.mp4",
          "atelier-nephrologie.mp4"
        ], "/videos/medicale/nephrologie/")
      },
      {
        name: "neurologie",
        courses: makeCourses([
          "myastenie-auto-immune.mp4",
          "cephalee-et-algie-de-la-face.mp4",
          "maladie-de-parkinson.mp4",
          "sclerose-en-plaque.mp4",
          "avc.mp4",
          "les-epilepsies.mp4",
          "compression-medulaire-non-traumatique.mp4",
          "hemorragie-meningee.mp4",
          "atelier-neurologie.mp4",
          "atelier-neurologie-1.mp4"
        ], "/videos/medicale/neurologie/")
      },
      {
        name: "pediatrie",
        courses: makeCourses([
          "developpement-psychomoteur.mp4",
          "alimentation-de-lenfant-sain.mp4",
          "icter-a-bilirubine-libre-du-nouveau-ne.mp4",
          "diarrhee-aigue-rachitisme.mp4",
          "detresse-respiratoire-aigue-nouveau-ne.mp4",
          "diarrhee-chronique-enfant.mp4",
          "diarrhee-chronique-enfant-suite.mp4",
          "rougeole.mp4",
          "atelier-pediatrie.mp4",
          "atelier-pediatrie-1.mp4"
        ], "/videos/medicale/pediatrie/")
      },
      {
        name: "pneumologie",
        courses: makeCourses([
          "pneumonie-aigue-communitaire.mp4",
          "epanchement-pleural.mp4",
          "tuberculose.mp4",
          "traitement-anti-tuberculeux.mp4",
          "insuffisance-respiratoire-chronique.mp4",
          "cancer-broncho-pulmonaire.mp4",
          "asthme-bronchique.mp4",
          "atelier-pneumologie.mp4"
        ], "/videos/medicale/pneumologie/")
      },
      {
        name: "psychiatrie",
        courses: makeCourses([
          "schizophrenie.mp4",
          "delire-paranoique-etats-depressifs.mp4",
          "atelier-psychiatrie.mp4",
          "atelier-psychiatrie-1.mp4",
          "atelier-psychiatrie-2.mp4"
        ], "/videos/medicale/psychiatrie/")
      },
      {
        name: "rhumatologie",
        courses: makeCourses([
          "poly-arthrite-rhumatoide.mp4",
          "syndrome-de-gogerot-sjogren.mp4",
          "connectivites.mp4",
          "ma-de-pott.mp4",
          "atelier-rhumatologie.mp4"
        ], "/videos/medicale/rhumatologie/")
      }
    ]
  }
];

fs.writeFileSync("./public/data/cours.json", JSON.stringify(data, null, 2), "utf-8");

console.log("✅ cours.json complet généré avec biologie + chirurgie + medicale");
