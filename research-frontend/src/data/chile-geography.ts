export interface Commune {
    name: string;
}

export interface Region {
    name: string;
    communes: Commune[];
}

export const CHILE_REGIONS: Region[] = [
    {
        name: "Arica y Parinacota",
        communes: [{ name: "Arica" }, { name: "Camarones" }, { name: "Putre" }, { name: "General Lagos" }]
    },
    {
        name: "Tarapacá",
        communes: [{ name: "Iquique" }, { name: "Alto Hospicio" }, { name: "Pozo Almonte" }, { name: "Camiña" }, { name: "Colchane" }, { name: "Huara" }, { name: "Pica" }]
    },
    {
        name: "Antofagasta",
        communes: [{ name: "Antofagasta" }, { name: "Mejillones" }, { name: "Sierra Gorda" }, { name: "Taltal" }, { name: "Calama" }, { name: "Ollagüe" }, { name: "San Pedro de Atacama" }, { name: "Tocopilla" }, { name: "María Elena" }]
    },
    {
        name: "Atacama",
        communes: [{ name: "Copiapó" }, { name: "Caldera" }, { name: "Tierra Amarilla" }, { name: "Chañaral" }, { name: "Diego de Almagro" }, { name: "Vallenar" }, { name: "Alto del Carmen" }, { name: "Freirina" }, { name: "Huasco" }]
    },
    {
        name: "Coquimbo",
        communes: [{ name: "La Serena" }, { name: "Coquimbo" }, { name: "Andacollo" }, { name: "La Higuera" }, { name: "Paiguano" }, { name: "Vicuña" }, { name: "Illapel" }, { name: "Canela" }, { name: "Los Vilos" }, { name: "Salamanca" }, { name: "Ovalle" }, { name: "Combarbalá" }, { name: "Monte Patria" }, { name: "Punitaqui" }, { name: "Río Hurtado" }]
    },
    {
        name: "Valparaíso",
        communes: [{ name: "Valparaíso" }, { name: "Casablanca" }, { name: "Concón" }, { name: "Juan Fernández" }, { name: "Puchuncaví" }, { name: "Quintero" }, { name: "Viña del Mar" }, { name: "Isla de Pascua" }, { name: "Los Andes" }, { name: "Calle Larga" }, { name: "Rinconada" }, { name: "San Esteban" }, { name: "La Ligua" }, { name: "Cabildo" }, { name: "Papudo" }, { name: "Petorca" }, { name: "Zapallar" }, { name: "Quillota" }, { name: "Calera" }, { name: "Hijuelas" }, { name: "La Cruz" }, { name: "Nogales" }, { name: "San Antonio" }, { name: "Algarrobo" }, { name: "Cartagena" }, { name: "El Quisco" }, { name: "El Tabo" }, { name: "Santo Domingo" }, { name: "San Felipe" }, { name: "Catemu" }, { name: "Llaillay" }, { name: "Panquehue" }, { name: "Putaendo" }, { name: "Santa María" }, { name: "Quilpué" }, { name: "Limache" }, { name: "Olmué" }, { name: "Villa Alemana" }]
    },
    {
        name: "Metropolitana",
        communes: [{ name: "Cerrillos" }, { name: "Cerro Navia" }, { name: "Conchalí" }, { name: "El Bosque" }, { name: "Estación Central" }, { name: "Huechuraba" }, { name: "Independencia" }, { name: "La Cisterna" }, { name: "La Florida" }, { name: "La Granja" }, { name: "La Pintana" }, { name: "La Reina" }, { name: "Las Condes" }, { name: "Lo Barnechea" }, { name: "Lo Espejo" }, { name: "Lo Prado" }, { name: "Macul" }, { name: "Maipú" }, { name: "Ñuñoa" }, { name: "Pedro Aguirre Cerda" }, { name: "Peñalolén" }, { name: "Providencia" }, { name: "Pudahuel" }, { name: "Quilicura" }, { name: "Quinta Normal" }, { name: "Recoleta" }, { name: "Renca" }, { name: "San Joaquín" }, { name: "San Miguel" }, { name: "San Ramón" }, { name: "Santiago" }, { name: "Vitacura" }, { name: "Puente Alto" }, { name: "Pirque" }, { name: "San José de Maipo" }, { name: "Colina" }, { name: "Lampa" }, { name: "Tiltil" }, { name: "San Bernardo" }, { name: "Buin" }, { name: "Calera de Tango" }, { name: "Paine" }, { name: "Melipilla" }, { name: "Alhué" }, { name: "Curacaví" }, { name: "María Pinto" }, { name: "San Pedro" }, { name: "Talagante" }, { name: "El Monte" }, { name: "Isla de Maipo" }, { name: "Padre Hurtado" }, { name: "Peñaflor" }]
    },
    {
        name: "O'Higgins",
        communes: [{ name: "Rancagua" }, { name: "Codegua" }, { name: "Coinco" }, { name: "Coltauco" }, { name: "Doñihue" }, { name: "Graneros" }, { name: "Las Cabras" }, { name: "Machalí" }, { name: "Malloa" }, { name: "Mostazal" }, { name: "Olivar" }, { name: "Peumo" }, { name: "Pichidegua" }, { name: "Quinta de Tilcoco" }, { name: "Rengo" }, { name: "Requínoa" }, { name: "San Vicente" }, { name: "Pichilemu" }, { name: "La Estrella" }, { name: "Litueche" }, { name: "Marchigüe" }, { name: "Navidad" }, { name: "Paredones" }, { name: "San Fernando" }, { name: "Chépica" }, { name: "Chimbarongo" }, { name: "Lolol" }, { name: "Nancagua" }, { name: "Palmilla" }, { name: "Peralillo" }, { name: "Placilla" }, { name: "Pumanque" }, { name: "Santa Cruz" }]
    },
    {
        name: "Maule",
        communes: [{ name: "Talca" }, { name: "Constitución" }, { name: "Curepto" }, { name: "Empedrado" }, { name: "Maule" }, { name: "Pelarco" }, { name: "Pencahue" }, { name: "Río Claro" }, { name: "San Clemente" }, { name: "San Rafael" }, { name: "Cauquenes" }, { name: "Chanco" }, { name: "Pelluhue" }, { name: "Curicó" }, { name: "Hualañé" }, { name: "Licantén" }, { name: "Molina" }, { name: "Rauco" }, { name: "Romeral" }, { name: "Sagrada Familia" }, { name: "Teno" }, { name: "Vichuquén" }, { name: "Linares" }, { name: "Colbún" }, { name: "Longaví" }, { name: "Parral" }, { name: "Retiro" }, { name: "San Javier" }, { name: "Villa Alegre" }, { name: "Yerbas Buenas" }]
    },
    {
        name: "Ñuble",
        communes: [{ name: "Chillán" }, { name: "Bulnes" }, { name: "Cobquecura" }, { name: "Coelemu" }, { name: "Coihueco" }, { name: "Chillán Viejo" }, { name: "El Carmen" }, { name: "Ninhue" }, { name: "Ñiquén" }, { name: "Pemuco" }, { name: "Pinto" }, { name: "Portezuelo" }, { name: "Quillón" }, { name: "Quirihue" }, { name: "Ránquil" }, { name: "San Carlos" }, { name: "San Fabián" }, { name: "San Ignacio" }, { name: "San Nicolás" }, { name: "Treguaco" }, { name: "Yungay" }]
    },
    {
        name: "Biobío",
        communes: [{ name: "Concepción" }, { name: "Coronel" }, { name: "Chiguayante" }, { name: "Florida" }, { name: "Hualqui" }, { name: "Lota" }, { name: "Penco" }, { name: "San Pedro de la Paz" }, { name: "Santa Juana" }, { name: "Talcahuano" }, { name: "Tomé" }, { name: "Hualpén" }, { name: "Lebu" }, { name: "Arauco" }, { name: "Cañete" }, { name: "Contulmo" }, { name: "Curanilahue" }, { name: "Los Álamos" }, { name: "Tirúa" }, { name: "Los Ángeles" }, { name: "Antuco" }, { name: "Cabrero" }, { name: "Laja" }, { name: "Mulchén" }, { name: "Nacimiento" }, { name: "Negrete" }, { name: "Quilleco" }, { name: "San Rosendo" }, { name: "Santa Bárbara" }, { name: "Tucapel" }, { name: "Yumbel" }, { name: "Alto Biobío" }]
    },
    {
        name: "La Araucanía",
        communes: [{ name: "Temuco" }, { name: "Carahue" }, { name: "Cunco" }, { name: "Curarrehue" }, { name: "Freire" }, { name: "Galvarino" }, { name: "Gorbea" }, { name: "Lautaro" }, { name: "Loncoche" }, { name: "Melipeuco" }, { name: "Nueva Imperial" }, { name: "Padre Las Casas" }, { name: "Perquenco" }, { name: "Pitrufquén" }, { name: "Pucón" }, { name: "Saavedra" }, { name: "Teodoro Schmidt" }, { name: "Toltén" }, { name: "Vilcún" }, { name: "Villarrica" }, { name: "Cholchol" }, { name: "Angol" }, { name: "Collipulli" }, { name: "Curacautín" }, { name: "Ercilla" }, { name: "Lonquimay" }, { name: "Los Sauces" }, { name: "Lumaco" }, { name: "Purén" }, { name: "Renaico" }, { name: "Traiguén" }, { name: "Victoria" }]
    },
    {
        name: "Los Ríos",
        communes: [{ name: "Valdivia" }, { name: "Corral" }, { name: "Lanco" }, { name: "Los Lagos" }, { name: "Máfil" }, { name: "Mariquina" }, { name: "Paillaco" }, { name: "Panguipulli" }, { name: "La Unión" }, { name: "Futrono" }, { name: "Lago Ranco" }, { name: "Río Bueno" }]
    },
    {
        name: "Los Lagos",
        communes: [{ name: "Puerto Montt" }, { name: "Calbuco" }, { name: "Cochamó" }, { name: "Fresia" }, { name: "Frutillar" }, { name: "Los Muermos" }, { name: "Llanquihue" }, { name: "Maullín" }, { name: "Puerto Varas" }, { name: "Castro" }, { name: "Ancud" }, { name: "Chonchi" }, { name: "Curaco de Vélez" }, { name: "Dalcahue" }, { name: "Puqueldón" }, { name: "Queilén" }, { name: "Quellón" }, { name: "Quemchi" }, { name: "Quinchao" }, { name: "Osorno" }, { name: "Puerto Octay" }, { name: "Purranque" }, { name: "Puyehue" }, { name: "Río Negro" }, { name: "San Juan de la Costa" }, { name: "San Pablo" }, { name: "Chaitén" }, { name: "Futaleufú" }, { name: "Hualaihué" }, { name: "Palena" }]
    },
    {
        name: "Aysén",
        communes: [{ name: "Coyhaique" }, { name: "Lago Verde" }, { name: "Aysén" }, { name: "Cisnes" }, { name: "Guaitecas" }, { name: "Cochrane" }, { name: "O'Higgins" }, { name: "Tortel" }, { name: "Chile Chico" }, { name: "Río Ibáñez" }]
    },
    {
        name: "Magallanes",
        communes: [{ name: "Punta Arenas" }, { name: "Laguna Blanca" }, { name: "Río Verde" }, { name: "San Gregorio" }, { name: "Cabo de Hornos" }, { name: "Antártica" }, { name: "Porvenir" }, { name: "Primavera" }, { name: "Timaukel" }, { name: "Natales" }, { name: "Torres del Paine" }]
    }
];
