# VisioGeoJSON
This project is a sample that demonstrate you how to visualize your Visioglobe GeoJSON map.
You can see the result here : https://cdn.visioglobe.com/visiogeojson/mapviewer.html

## Installing
To use this project you can put the repository in your local server and open the *mapviewer.html* file.

## URL parameters
To quickly see the result of your map with this project, you can add the map hash to the url parameters.
For example : http://localhost:8080/visioGeoJSON/mapviewer.html?hash=1f6e2327a641ebc204591684b18793431e9af433

You can also customize the map viewer with these parameters :
- Show outside : mapview[nooutside]
- Active place color : mapview[activeColor]=%2300FF00
- The map opacity : mapview[fillOpacity]=0.3
- The stroke width : mapview[strokeWidth]=2
- The stroke opacity : mapview[strokeOpacity]=0.8

For example :
http://localhost:8080/visioGeoJSON/mapviewer.html?hash=1f6e2327a641ebc204591684b18793431e9af433&mapview[nooutside]&mapview[activeColor]=%2300FF00&mapview[fillOpacity]=0.3&mapview[strokeWidth]=2&mapview[strokeOpacity]=0.8

Note that you can do the same exercise with :
https://cdn.visioglobe.com/visiogeojson/mapviewer.html
