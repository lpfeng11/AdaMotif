import {
  BSplineShapeGenerator,
  BubbleSet,
  PointPath,
  ShapeSimplifier,
} from './bubblesets.js';

function draw_radical_graph(sliceId, graph_name) {

  fetch(`../data/init_graph_json/${graph_name}_init_graph_data.json`)
  .then(response => {
    if (response.ok) {
      return response.json(); 
    } else {
      throw new Error('File not found'); 
    }
  })
  .then(jsonData => {
    const txtFiles = [];
    const numFiles = 9
    for(let i = 0; i < numFiles; i++) {
      const txtFileName = `subgraph_${i}_nodes.txt`;
      txtFiles.push(txtFileName)
    }

    const txtPromises = txtFiles.map(txtFile => {
      return fetch(`../result_data/${graph_name}/community/result_multilevel/subgraph_Data/${txtFile}`).then(response => {
        if (response.ok) {
          return response.text(); 
        } else {
          throw new Error(`File ${txtFile} not found`); 
        }
      });
    });

    console.log("txtPromises",txtPromises)

    const cluster_path = `../result_data/${graph_name}/community/result_multilevel/AffinityPropagationcluster_result.json/AffinityPropagationcluster_result.json`

    return Promise.all(
      txtPromises,
      ).then(data => {
      return {
        jsonData: jsonData,
        txtDataArray: data
      };
    });
  })
  .then(({ jsonData, txtDataArray }) => {
    processData(jsonData, txtDataArray);
  })

  function processData(jsonData, txtDataArray) {

    

    const nodeIdData = []

    for(let i = 0; i < txtDataArray.length; i++){
      const dataArray = txtDataArray[i].trim().split("\r\n");
      const nodeIds = dataArray.map(id => id);
      nodeIdData.push(nodeIds)
    }
    console.log("nodeIdData",nodeIdData)
    

    const nodes = jsonData.nodes
    const links = jsonData.links

    var graph_nodes = nodes
    var graph_edges = links

    console.log("graph_nodes:")
    console.log(graph_nodes)
    console.log("graph_edges:")
    console.log(graph_edges)

    var colors = d3.schemeTableau10

    const width = 800
    const height = 800

    const initialScale = 0.5; 

    const selector = "#" + sliceId
    const svg = d3.select(selector)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr('class', 'svg1')
      .call(d3.zoom().on("zoom", (event) => {
            graphContainer.attr("transform", event.transform)
        })
      )
      .append("g")
      .attr("transform", `scale(${initialScale})`) 
    
    const graphContainer = svg.append("g")

    const linkDistance = 100
    const collide = 10
    const distanceMax = 100
    const charge = -100

    const simulation = d3.forceSimulation(graph_nodes)
      .force("link", d3.forceLink(graph_edges).id(d => d.id).distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(charge).distanceMax(distanceMax))
      .force("center", d3.forceCenter(width , height ))
      .force("collide", d3.forceCollide().radius(collide)) 


    graph_nodes.forEach(node => {
        node.fx = node.x ; 
        node.fy = node.y ; 
    });

    colors = d3.schemeTableau10;

    const link = graphContainer.append("g")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(graph_edges)
      .enter()
      .append("line")
      .style("stroke", (d, i) => {

        return "grey"
      })
      .style("stroke-width", 0.7)

    const node = graphContainer.append("g")
      .selectAll("circle")
      .data(graph_nodes)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", (d, i) => {

        return "grey"
      })

      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    

    const link2 = graphContainer.append("g")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(graph_edges)
      .enter()
      .append("line")
      .style("stroke", (d, i) => {
        for(let j = 0; j < nodeIdData.length; j++){
          if(nodeIdData[j].includes(d.source.id) && nodeIdData[j].includes(d.target.id)){
            return colors[cluster_data[j]]
          }
        }
        return "grey"
      })
      .style("stroke-width", 0.7)

      const node2 = graphContainer.append("g")
      // .attr("stroke-opacity", 3)
      // .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(graph_nodes)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", (d, i) => {

        for(let j = 0; j < nodeIdData.length; j++){
          if(nodeIdData[j].includes(d.id)){

            return colors[cluster_data[j]]
            
          }
        }

        return "grey"
      })

      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))


    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
      link2
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
      node2
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)

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
    
  }


  function processDataFromText(text) {
    const lines = text.split('\n')
    let isEdges = false

    temp_nodes = []

      lines.forEach(line => {
        if (+line === 1111111111) {
          isEdges = true
        } else if (!isEdges && line) {
          const [id, weight] = line.split(" ");
          graph_nodes.push({ id: +id, weight: +weight });
        } else if (isEdges && line) {
          let source, target;
          if (line.includes(' ')) {
            [source, target] = line.split(' '); 
          } else if (line.includes(',')) {
              [source, target] = line.split(','); 
          } else {

              console.log("无法确定分隔符");
          }
          graph_edges.push({ source: +source, target: +target })
        }
      })
    // }

    console.log("graph_nodes:")
    console.log(graph_nodes)
    console.log("graph_edges:")
    console.log(graph_edges)

    colors = d3.schemeTableau10

    const width = 800
    const height = 800

    const initialScale = 0.5; 

    const selector = "#" + sliceId
    const svg = d3.select(selector)
      .append("svg")
      .attr('class', 'svg1')
      .attr("width", width)
      .attr("height", height)
      .call(d3.zoom().on("zoom", (event) => {
            graphContainer.attr("transform", event.transform)
        })
      )
      .append("g")
      .attr("transform", `scale(${initialScale})`) 
    
    const graphContainer = svg.append("g")

    const simulation = d3.forceSimulation(graph_nodes)
    .force("link", d3.forceLink(graph_edges).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width , height ))

    const link = graphContainer.append("g")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(graph_edges)
      .enter()
      .append("line")
      .style("stroke", "#999")
      .style("stroke-width", 0.7)

    const node = graphContainer.append("g")
      .attr("stroke-opacity", 3)
      .attr("stroke-width", 1.5)
      .attr("fill", "blue")
      .attr("stroke", "#fff")
      .selectAll("circle")
      .data(graph_nodes)
      .enter()
      .append("circle")
      .attr("r", 5)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)

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
  }

}

export { draw_radical_graph };