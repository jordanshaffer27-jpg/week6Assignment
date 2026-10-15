
import Map from "https://js.arcgis.com/5.1/@arcgis/core/Map.js";
import Graphic from "https://js.arcgis.com/5.1/@arcgis/core/Graphic.js";
import GraphicsLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/GraphicsLayer.js";
import SceneView from "https://js.arcgis.com/5.1/@arcgis/core/views/SceneView.js";
import FeatureLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/FeatureLayer.js"; 


// Create a 3D map with terrain
const map = new Map({
    basemap: "hybrid",
    ground: "world-elevation"
});

// Create the 3D SceneView centered on Alaska
const view = new SceneView({
    container: "map",
    map: map,
    viewingMode: "global",

    
camera: {
    position: {
        longitude: -152.5,
        latitude: 63.5,
        z: 1400000
    },
    heading: 0,
    tilt: 0
},


    popup: {
        dockEnabled: false
    },

    environment: {
        lighting: {
            directShadowsEnabled: true
        }
    }
});

// Layer for our adventure locations

// Colors for different adventure categories
const colors = {
    Home: [255, 215, 0],
    Camping: [0, 180, 80],
    Fishing: [0, 150, 255],
    Hiking: [255, 100, 0],
    Exploration: [180, 80, 255]
};

// Convert myStuff locations into ArcGIS graphics
const adventurePoints = [];

let objectId = 1;

for (const [key, value] of Object.entries(myStuff)) {
    adventurePoints.push(new Graphic({
        geometry: {
            type: "point",
            longitude: value.coord[0],
            latitude: value.coord[1]
        },
        attributes: {
            ObjectID: objectId++,
            name: key,
            city: value.city,
            state: value.state,
            category: value.category,
            description: value.description
        }
    }));
}

// Create a FeatureLayer with custom symbols
const adventureLayer = new FeatureLayer({
    source: adventurePoints,
    objectIdField: "ObjectID",
    geometryType: "point",
    spatialReference: { wkid: 4326 },

    fields: [
        { name: "ObjectID", type: "oid" },
        { name: "name", type: "string" },
        { name: "city", type: "string" },
        { name: "state", type: "string" },
        { name: "category", type: "string" },
        { name: "description", type: "string" }
    ],

    renderer: {
        type: "unique-value",
        field: "category",
        uniqueValueInfos: Object.entries(colors).map(
            ([category, color]) => ({
                value: category,
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    color: color,
                    size: 14,
                    outline: {
                        color: "white",
                        width: 2
                    }
                }
            })
        )
    },

    popupTemplate: {
        title: "{name}",
        content: `
            <b>Location:</b> {city}, {state}<br>
            <b>Activity:</b> {category}<br><br>
            {description}
        `
    },

    featureReduction: {
        type: "cluster",
        clusterRadius: "100px",
        popupTemplate: {
            title: "Adventure Location Cluster",
            content: "This cluster contains {cluster_count} locations."
        },
        labelingInfo: [{
            deconflictionStrategy: "none",
            labelExpressionInfo: {
                expression: "Text($feature.cluster_count, '#')"
            },
            symbol: {
                type: "text",
                color: "white",
                font: {
                    size: 12,
                    weight: "bold"
                }
            }
        }]
    }
});

map.add(adventureLayer);


// Zoom to a marker when clicked

view.on("click", async (event) => {
    const response = await view.hitTest(event);

    const result = response.results.find(
        item =>
            item.graphic &&
            item.graphic.layer === adventureLayer
    );

    if (result) {
        const graphic = result.graphic;

        await view.goTo({
            target: graphic.geometry,
            scale: 100000,
            tilt: 45
        }, {
            duration: 2000
        });
    }
});


// Coordinates for searchable Alaska locations

const alaskaCities = {
    "Fairbanks": [-147.7164, 64.8378],
    "Anchorage": [-149.9003, 61.2181],
    "Nome": [-165.4064, 64.5011],
    "Valdez": [-146.3483, 61.1308],
    "Denali": [-151.1926, 63.1148],
    "Minto": [-149.369, 65.154],
    "Delta Junction": [-145.7322, 64.0378],
    "Galbraith Lake": [-149.49, 68.48]
};

// Search for an Alaska location


const searchButton = document.getElementById("searchButton");
const citySearch = document.getElementById("citySearch");

searchButton.addEventListener("click", async function () {

    const selectedCity = citySearch.value;
    const coordinates = alaskaCities[selectedCity];

    if (!coordinates) {
        alert("Please select a location.");
        return;
    }

    const [longitude, latitude] = coordinates;

    console.log("Selected city:", selectedCity);
    console.log("Coordinates:", longitude, latitude);

    try {
        // Wait until the 3D scene is ready
        await view.when();

        // Create a camera from the current view
        const camera = view.camera.clone();

        // Move the camera directly above the city
        camera.position = {
            type: "point",
            longitude: longitude,
            latitude: latitude,
            z: 30000,
            spatialReference: {
                wkid: 4326
            }
        };

        // Look straight down
        camera.heading = 0;
        camera.tilt = 0;

        // Animate the camera to the selected city
        await view.goTo(camera, {
            duration: 2500
        });

        console.log("Successfully moved to:", selectedCity);

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Search navigation error:", error);
        }
    }
});
