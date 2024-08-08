function simplified_graph(graph_name, communityPartitionMethod, cluster_method){
    
    const allNodes = [];
    const allEdges = [];

    let clusteringCategory = [];

    const colors = d3.schemeTableau10;

    const filePath = `../data_processed/${graph_name}/simplified_init_position/simplified_init_position.json/simplified_position.json`;
    const common_subgraphs_filePath = `../data_processed/${graph_name}/Graph.json`;
    const unaligned_subgraph = `../data_processed/${graph_name}/align_subgraph_json/align_subgraph.json`
    const clusterResult = `../data_processed/${graph_name}/cluster_result/cluster_result_subgraph.json`
    
    Promise.all([
        d3.json(filePath),
        d3.json(common_subgraphs_filePath),
        d3.json(unaligned_subgraph),
        d3.json(clusterResult)
      ])
    .then(function (data) {
        const community_nodes = data[0].nodes
        const community_edges = data[0].links
        const common_subgraphs = data[1]
        const simplifiedSliceId = "simplified-graph"
        const common_subgraphs_radius = compute_common_subgraphs_radius(common_subgraphs)
        const unaligned_subgraph = data[2]
        const clusterResult = data[3]
        clusteringCategory = clusterResult.clusters_str
        draw_simplified_graph(simplifiedSliceId, community_nodes, community_edges, common_subgraphs, common_subgraphs_radius, unaligned_subgraph)
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



    function draw_simplified_graph(sliceId, graphNodes, graphLinks, common_subgraphs, common_subgraphs_radius, unaligned_subgraph) {
    
        const nodes = graphNodes
        const links = graphLinks
    
        const width = 1600
        const height = 1600
    
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
            let scale = (node_radius(d))/(common_subgraphs_radius[clusteringCategory[i]])
            if(graph_name == 'Cpan'){
                scale = (node_radius(d))/(common_subgraphs_radius[clusteringCategory[i]])
            }else if(graph_name == 'AS-733'){
                scale = (node_radius(d))/(common_subgraphs_radius[clusteringCategory[i]])
            }else if(graph_name == 'aves-weaver-social'){
                scale = (d.size + 5)/10
            }else if(graph_name == 'test'){
                scale = (d.size - 5)/10 + 1
            }

            return scale
        }
    
        const selector = "#" + sliceId

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr('class', 'svg2')
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
        }else if(graph_name == 'bio-diseasome'){
            linkDistance = 50
            collide = 20
            distanceMax = 50
            charge = -100
        }else if(graph_name == 'test'){
            linkDistance = 100
            collide = 20
            distanceMax = 50
            charge = -100
        }else if(graph_name == 'lastfm_asia'){
            linkDistance = 600
            collide = 30
            distanceMax = 600
            charge = -100
        }else if(graph_name == 'aves-weaver-social'){
            linkDistance = 50
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
            .force("collide", d3.forceCollide().radius(d => getCollide(d))) // 设置碰撞力，避免节点重叠


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
        .attr('stroke-width', 3)
        .attr('d', (d, i) => generateContour(d, i));

    
        glyph.append('path')
        .attr('class', 'glyph-path')
        .attr('stroke', 'black')
        .attr('stroke-width', (d, i) => 0.3 / glyph_scale(d, i)) 
        .attr('fill', 'none') 
        .attr('d', (d, i) => generateGlyphPath(d, i, false))


        glyph.append('path')
        .attr('class', 'glyph-path')
        .attr('stroke', 'black')
        .attr('stroke-width', (d, i) => 0.2 / glyph_scale(d, i)) 
        .attr('fill', 'none') 
        .attr('stroke-dasharray','2 2') 
        .attr('d', (d, i) => generateGlyphPath(d, i, true))


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
      
            const subgraph = common_subgraphs[clusteringCategory[i]];
            const unaligned = unaligned_subgraph.data[i]

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


                let isdashed = false
                let value = 0
                for (const pair of unaligned) {
                    if (pair[0] === source) {
                        value = pair[1];
                        if(value < 0){
                            isdashed = true
                        }
                        break; 
                    }
                }
                for (const pair of unaligned) {
                    if (pair[0] === target) {
                        value = pair[1];
                        if(value < 0){
                            isdashed = true
                        }
                        break;
                    }
                }

                if(isdashed == true){
                    if(isNeedDashed == true){
                        return `M ${startX} ${startY} L ${endX} ${endY}`;
                    }
                }else{
                    if(isNeedDashed != true){
                        return `M ${startX} ${startY} L ${endX} ${endY}`;
                    }
                }
                return ``
                
            });

            return lines.join(' ');

        }


        function generatePoints(d, i) {

            const subgraph = common_subgraphs[clusteringCategory[i]];
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

            subgraph.links.forEach((link, index) => {

                data.push({
                    x:((link.source.x - link.target.x ) / 2 + link.target.x - centerX) ,
                    y:((link.source.y - link.target.y ) / 2 + link.target.y - centerY) 
                })
                data.push({
                    x:((link.source.x - link.target.x ) / 4 + link.target.x - centerX) ,
                    y:((link.source.y - link.target.y ) / 4 + link.target.y - centerY) 
                })
                data.push({
                    x:((link.source.x - link.target.x ) / 4 * 3 + link.target.x - centerX) ,
                    y:((link.source.y - link.target.y ) / 4 * 3 + link.target.y - centerY) 
                })
                data.push({
                    x:((link.source.x - link.target.x ) / 8 + link.target.x - centerX) ,
                    y:((link.source.y - link.target.y ) / 8 + link.target.y - centerY) 
                })
                data.push({
                    x:((link.source.x - link.target.x ) / 8 * 7 + link.target.x - centerX) ,
                    y:((link.source.y - link.target.y ) / 8 * 7 + link.target.y - centerY) 
                })
            })

            return data;
        }

        function generateUnalignedPoints(d, i) {

            const subgraph = common_subgraphs[clusteringCategory[i]];

            const unaligned = unaligned_subgraph.data[i]

            let data = [];

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            subgraph.nodes.forEach((node, index) => {
                const id = +node.id
                let value;
                for (const pair of unaligned) {
                    if (pair[0] === id) {
                        value = pair[1];
                        break; 
                    }
                }
                const radius = 4
                if (value === -1) {

                    data.push({x: node.x - centerX, y: node.y - centerY, color: "white", stroke: 0.2, strokeColor:"black", 
                    radius: radius, 
                    scaleValue: 1/glyph_scale(d, i),
                    condition: true
                })
                }else if (value > 0){

                    var unaligned_radius = 0
                    if(value < 10){
                        unaligned_radius = 1.3
                    }else if(value < 20){
                        unaligned_radius = 2.6
                    }else{
                        unaligned_radius = 4
                    }
                    
                    data.push({x: node.x - centerX, y: node.y - centerY, color: "white", stroke: 0.3, strokeColor:"black",
                     radius: radius + unaligned_radius, 
                     scaleValue: 1/glyph_scale(d, i),
                     condition: false
                    })

                    data.push({x: node.x - centerX, y: node.y - centerY, color: "darkgray", stroke: 0.3, strokeColor:"black",
                     radius: radius, 
                     scaleValue: 1/glyph_scale(d, i),
                     condition: false
                    })
                }else {
                    data.push({x: node.x - centerX, y: node.y - centerY, color: "grey", stroke: 0.1, strokeColor:"white", 
                    radius: radius, 
                    scaleValue: 1/glyph_scale(d, i),
                    condition: false
                })
                }
            })

            return data;
        }
        
        function generateUnalignedPath(d, i) {

            const subgraph = common_subgraphs[clusteringCategory[i]];

            const unaligned = unaligned_subgraph.data[i]

            let lines = [];

            const minX = Math.min(...subgraph.nodes.map(node => +node.x));
            const maxX = Math.max(...subgraph.nodes.map(node => +node.x));
            const minY = Math.min(...subgraph.nodes.map(node => +node.y));
            const maxY = Math.max(...subgraph.nodes.map(node => +node.y));
            const centerX = (maxX - minX)/2 + minX;
            const centerY = (maxY - minY)/2 + minY;

            subgraph.nodes.forEach((node, index) => {
                const id = +node.id
                let value;
                for (const pair of unaligned) {
                    if (pair[0] === id) {
                        value = pair[1];
                        break; 
                    }
                }
                const radius = 6.5
                const scale = (common_subgraphs_radius[clusteringCategory[i]]) / (glyph_scale * node_radius(d))
                if (value > 0) {
                    for(let value_index = 0; value_index < value; value_index++){
                        let angle = (value_index / value) * Math.PI * 2;
                        lines.push(`M ${node.x - centerX} ${node.y - centerY} L ${node.x - centerX + scale * radius * Math.cos(angle)} ${node.y - centerY + scale * radius * Math.sin(angle)}`)
                    }
                }
            })

            return lines.join(' ')
        }


        function generateContour(d, i) {
            const subgraph = common_subgraphs[clusteringCategory[i]];

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

        
        d3.selectAll('.edge path').style('display', 'block');
        d3.selectAll('line').style('display', 'block');
        d3.selectAll('text').style('display', 'none');
        d3.selectAll('.glyph').style('display', 'block');
        d3.selectAll('.dot').style('display', 'none');
        d3.selectAll('.contour').style('display', 'block');
        d3.selectAll('.glyph-path').style('display', 'block');
        d3.selectAll('.arc').style('display', 'none');
        d3.selectAll('.white-circle').style('display', 'none');
        d3.selectAll('.unaligned').style('display', 'block');

        
    }

    

}

