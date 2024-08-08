import {
    BSplineShapeGenerator,
    BubbleSet,
    PointPath,
    ShapeSimplifier,
  } from './bubblesets.js';

function bubble_graph(graph_name, communityPartitionMethod, cluster_method){

    let clusteringCategory = [];

    const colors = d3.schemeTableau10;

    const filePath = `../data_processed/${graph_name}/simplified_init_position/simplified_init_position.json/simplified_position.json`;
    const common_subgraphs_filePath = `../data_processed/${graph_name}/Graph.json`;
    const clusterResult = `../data_processed/${graph_name}/cluster_result/cluster_result_subgraph.json`

    Promise.all([
        d3.json(filePath),
        d3.json(common_subgraphs_filePath),
        d3.json(clusterResult)
      ])
    .then(function (data) {
        const community_nodes = data[0].nodes
        const community_edges = data[0].links
        const common_subgraphs = data[1]
        const simplifiedSliceId = "bubble-set"
        const common_subgraphs_radius = compute_common_subgraphs_radius(common_subgraphs)
        const clusterResult = data[2]
        clusteringCategory = clusterResult.clusters_str
        draw_bubblegraph(simplifiedSliceId, community_nodes, community_edges, common_subgraphs, common_subgraphs_radius)
    })

    function compute_common_subgraphs_radius(common_subgraphs){
        let radius = []
        common_subgraphs.forEach(subgraph => {

            const nodeCount = subgraph.nodes.length;
            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            let maxDistance = -Infinity;
            let farthestNode = null;

            subgraph.nodes.forEach(node => {
                const distance = Math.sqrt((+node.x - centerX) ** 2 + (+node.y - centerY) ** 2);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    farthestNode = node;
                }
            });
            const r = maxDistance
            
            radius.push(r)
        })
        console.log("radius:",radius)
        return radius
    }



    function draw_bubblegraph(sliceId, graphNodes, graphLinks, common_subgraphs, common_subgraphs_radius) {
    
        const nodes = graphNodes
        const links = graphLinks
    
        const width = 800
        const height = 800
    
        const initialScale = 0.5; 

        const epsilon = 1e-10; 

        function node_radius(d){
            if(graph_name == 'Cpan'){
                return d.size + 35
            }else if(graph_name == 'AS-733'){
                return d.size/2 + 40
            }
            else if(graph_name == 'test'){
                return d.size + 45
            }
            return d.size
        }
        function glyph_scale(d, i){
            let scale = (node_radius(d))/(common_subgraphs_radius[i])
            if(graph_name == 'Cpan'){
                scale = (node_radius(d))/(common_subgraphs_radius[i])
            }else if(graph_name == 'AS-733'){
                scale = (node_radius(d))/(common_subgraphs_radius[i])
            }else if(graph_name == 'aves-weaver-social'){
                scale = (d.size + 5)/10
            }else if(graph_name == 'test'){
                scale = (d.size - 5)/10 + 1
                // scale = 1
            }

            return scale
        }
    
        const selector = "#" + sliceId

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr('class', 'svg3')
            .call(d3.zoom().on("zoom", (event) => {
                graphContainer.attr("transform", event.transform)
            })
            )
            .append("g")
            .attr("transform", `scale(${initialScale})`) 
        
        const graphContainer = svg.append("g")

        let linkDistance = 0
        let collide = 0
        let distanceMax = 0
        let charge = 0
        if(graph_name == 'Cpan'){
            linkDistance = 400
            collide = 30
            distanceMax = 400
            charge = -100
        }else if(graph_name == 'AS-733'){
            linkDistance = 600
            collide = 30
            distanceMax = 600
            charge = -100
        }else if(graph_name == 'test'){
            linkDistance = 100
            collide = 20
            distanceMax = 50
            charge = -100
        }

        
        function getlinkDistance(d){return linkDistance + node_radius(d)}
        function chargeStrength(d){return charge - node_radius(d)}
        function getDistanceMax(d){return distanceMax + node_radius(d)}
        function getCollide(d){return collide + node_radius(d)}

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => getlinkDistance(d)))
            .force("charge", d3.forceManyBody().strength(d => chargeStrength(d)).distanceMax(d => getDistanceMax(d)))
            .force("center", d3.forceCenter(width/2 , height/2))
            .force("collide", d3.forceCollide().radius(d => getCollide(d))) 

        nodes.forEach(node => {
            node.cx = node.x ; 
            node.cy = node.y ; 
        });

        const hypotenuse = Math.sqrt(width * width + height * height)
        const scales = {

            nodes: d3.scaleSqrt()
                .range([4, 36]),

            segments: d3.scaleLinear()
                .domain([0, hypotenuse])
                .range([1, 10])
        }

        const edgeBundle = graphContainer.append('g')
        

        const link = graphContainer.append("g")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-linecap", "round")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .style("stroke", "#999")
        .style("stroke-width", 0.7)


        const node = graphContainer.append("g")
        .attr("stroke-opacity", 3)
        .attr("stroke-width", 1.5)
        .attr('class', 'node')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('fill', 'none') 

        .attr('r', d => node_radius(d)) 
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

        const glyph = graphContainer.selectAll('.glyph')
        .data(nodes)
        .enter().append("g")
        .attr('class', 'glyph')
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

        glyph.append('path')
        .attr('class', 'contour_base')
        .attr('fill', 'white')
        .attr('stroke-width', 3)
        .attr('d', (d, i) => generateContour(d, i));

        glyph.append('path')
        .attr('class', 'contour')
        .attr('fill', (d, i) => colors[clusteringCategory[i]])
        .attr("opacity", 0.3) 
        .attr('stroke', (d, i) => colors[clusteringCategory[i]]) 
        .attr('stroke-width', 3)
        .attr('d', (d, i) => generateContour(d, i));

    
        glyph.append('path')
        .attr('class', 'glyph-path')
        .attr('stroke', 'black')
        .attr('stroke-width', (d, i) => 0.3 / glyph_scale(d, i)) 
        .attr('fill', 'none') 
        .attr('d', (d, i) => generateGlyphPath(d, i, false))

        glyph.selectAll('.unaligned')
        .data((d, i) => generateUnalignedPoints(d, i)) 
        .enter().append('circle')
        .attr('class', 'unaligned')
        .attr('stroke', d => d.strokeColor) 
        .attr('stroke-width', d => d.stroke) 
        .attr('fill', d => d.color) 
        .attr('r', d => d.radius) 
        .attr("stroke-dasharray", d => !d.condition ? "none" : "1 1")
        .attr('cx', d => d.x) 
        .attr('cy', d => d.y) 
        .attr("transform-origin", d => `${d.x}px ${d.y}px`) 
        .attr('transform', (d) => `scale(${d.scaleValue})`); 


        glyph.selectAll('.dot')
        .data((d, i) => generatePoints(d, i)) 
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('fill', 'grey') 
        .attr('r', 2) 
        .attr('cx', d => d.x) 
        .attr('cy', d => d.y); 


    
        const label = graphContainer.append("g")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("x", -5) 
            .attr("y", 5) 
            .text(d => d.id)
            .attr("fill", "red")
            .style("font-size", "7px")
    

        simulation.on("tick", () => {
            link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
    
            node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
    
            label.attr("x", function (d) {
                return d.x
            })
            .attr("y", function (d) {
                return d.y
            })

            glyph
            .attr('transform', (d, i) => {
                let scale = glyph_scale(d, i)
                return `translate(${d.x}, ${d.y}) scale(${scale})`
            });

            
        })
        
        simulation.alpha(1)
        simulation.restart()
            .alphaMin(0.1)
        simulation.on("end", function (d) {
            console.log("drawEdgeBundel")
            drawEdgeBundel()
            console.log("layout complete")
        })
        
        function dragstarted (event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
        }
    
        function dragged (event, d) {
            d.fx = event.x
            d.fy = event.y
        }
    
        function dragended (event, d) {
            if (!event.active) simulation.alphaTarget(0)

            d.fx = null
            d.fy = null
        }


        function generateGlyphPath(d, i, isNeedDashed) {
      
            const subgraph = common_subgraphs[i];

            const nodeCount = subgraph.nodes.length;

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;
            

            const lines = subgraph.links.map(link => {
                const source = +link.source.id
                const target = +link.target.id
                const sourceNode = subgraph.nodes.find(node => +node.id === +source);
                const targetNode = subgraph.nodes.find(node => +node.id === +target);
                const startX = sourceNode.x - centerX; 
                const startY = sourceNode.y - centerY; 
                const endX = targetNode.x - centerX;    
                const endY = targetNode.y - centerY;     

                return `M ${startX} ${startY} L ${endX} ${endY}`;
                
            });

            return lines.join(' ');

        }


        function generatePoints(d, i) {

            const subgraph = common_subgraphs[i];
            let data = [];

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            subgraph.nodes.forEach((node, index) => {
                data.push({x: node.x - centerX, y: node.y - centerY})
            })

            return data;
        }

        function generateUnalignedPoints(d, i) {

            const subgraph = common_subgraphs[i];


            let data = [];

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            subgraph.nodes.forEach((node, index) => {
                const id = +node.id

                const radius = 4

                data.push({x: node.x - centerX, y: node.y - centerY, color: "grey", stroke: 0.1, strokeColor:"white", 
                    radius: radius, 
                    scaleValue: 1/glyph_scale(d, i),
                    condition: false
                })
                
            })

            return data;
        }

   
        function generateContour(d, i) {
            const subgraph = common_subgraphs[i];

            let data = [];
            const data_have_link = []
            const lines = [];

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            subgraph.nodes.forEach((node, index) => {
                data.push({x: node.x - centerX, y: node.y - centerY})

            })


            data = []
            const boundLen = subgraph.bound.x.length
            for(let k = 0; k < boundLen; k++){
                const x = subgraph.bound.x[k]
                const y = subgraph.bound.y[k]
                data.push({x: x - centerX, y: y - centerY})
            }


            if(data.length >=3) {

                let hullPoints = []
                data.forEach(data => {
                    hullPoints.push([data.x, data.y])
                })
                hullPoints.push(hullPoints[0]); 

                let scale = 1.0
                const hullCenter = [
                    d3.mean(hullPoints, d => d[0]),
                    d3.mean(hullPoints, d => d[1])
                ];

                const scaledHullPoints = hullPoints.map(point => {
                    const x = hullCenter[0] + (point[0] - hullCenter[0]) * scale;
                    const y = hullCenter[1] + (point[1] - hullCenter[1]) * scale;
                    return [x, y];
                });

                const curveLine = d3.line().curve(d3.curveCatmullRom.alpha(0.5)); 
                const curvePath = curveLine(scaledHullPoints);

                return curvePath;
            }

            else {
                return '';
            }

        }



        function generateSegments (nodes2, links2) {

            let bundle = { nodes: [], links: [], paths: [] }

            bundle.nodes = nodes2.map(function (d, i) {
                d.fx = d.x
                d.fy = d.y

                return d
            })

            links2.forEach(function (d, i) {

                let length = distance(d.source, d.target)
                let total = Math.round(scales.segments(length))
                let xscale = d3.scaleLinear()
                    .domain([0, total + 1]) 
                    .range([d.source.x, d.target.x])

                let yscale = d3.scaleLinear()
                    .domain([0, total + 1])
                    .range([d.source.y, d.target.y])

                let source = d.source
                let target = null

                let local = [source]

                for (let j = 1; j <= total; j++) {

                    target = {
                        x: xscale(j),
                        y: yscale(j),

                    }

                    local.push(target)
                    bundle.nodes.push(target)

                    bundle.links.push({
                        source: source,
                        target: target,
                    })

                    source = target
                }

                local.push(d.target)

                bundle.links.push({
                    source: target,
                    target: d.target
                })

                bundle.paths.push(local)
            })

            return bundle
        }
        function distance (source, target) {
            const dx2 = Math.pow(target.x - source.x, 2)
            const dy2 = Math.pow(target.y - source.y, 2)

            return Math.sqrt(dx2 + dy2)
        }


        function drawEdgeBundel () {
            svg.selectAll("line").remove()
            let bundle = generateSegments(nodes, links)
            console.log("bundle",bundle)
            const line = d3.line()
                .curve(d3.curveBundle)
                .x(node => node.x)
                .y(node => node.y)

            const edge = edgeBundle
                .attr("class", "edge")
                .selectAll("path")
                .data(bundle.paths)
                .enter()
                .append("path")
                .attr("d", line)
                .attr("fill", "none")
                .attr("stroke-opacity", (d, i) => {
                    return links[i].size/20 + 0.5
                })
                .style("stroke-width", (d, i) => links[i].size/20 + 0.5)
                .attr("stroke", function (d) {
                    return 'grey'
                })

            console.log(edge)

            let layout = d3.forceSimulation()

            .alphaDecay(0.1)

            .force("charge", d3.forceManyBody()
                .strength(20)
                .distanceMax(scales.nodes.range()[1] * 2)
            )

            .force("link", d3.forceLink()
                .distance(40)
            )
            .on("end", function (d) {
                console.log("layout complete")

            })

            layout.nodes(bundle.nodes).force("link").links(bundle.links)
            layout.on("tick", ticked3)

            function ticked3 () {
                node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)

                edge.attr("d", line)
            }

        }

        
    }

    

}

export { bubble_graph };

