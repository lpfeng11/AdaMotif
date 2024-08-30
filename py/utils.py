import networkx as nx
import pandas as pd
import igraph as ig
import csv
import numpy as np
import igraph as ig
import os
import shutil
import json
from karateclub import FeatherGraph
from node2vec import Node2Vec
from sklearn.cluster import AffinityPropagation
from concurrent.futures import ThreadPoolExecutor


class community_partition:
    def __init__(self, graphName):
        self.graphName = graphName
        self.result_folder = ('../data_processed/{}'.format(self.graphName))
        os.makedirs(self.result_folder, exist_ok=True)
        
    def dataProcess(self):
        nodes = []
        edges = []
        if self.graphName == 'Cpan' or self.graphName == 'AS-733':
            with open('../data/init_graph/{}_node.csv'.format(self.graphName), 'r',
                    encoding='utf-8') as fp:
                reader = csv.reader(fp)
                nodes = list(int(_[0]) for _ in reader)
            with open('../data/init_graph/{}_edge.csv'.format(self.graphName), 'r',
                    encoding='utf-8') as fp:
                reader = csv.reader(fp)
                edges = list((int(_[0]), int(_[1])) for _ in reader if _[0] != _[1])

        elif self.graphName == 'test':
            with open('../data/init_graph/{}.json'.format(self.graphName), 'r') as file:
                data = json.load(file)
                nodes_data = data['nodes']
                for node in nodes_data:
                    nodes.append(node['id'])
                links_data = data['links']
                for link in links_data:
                    edges.append((link['source'], link['target']))
                     
        return nodes, edges

    def saveInitGraph(self, G):

        file_txt = "graph_Data"
        graph_folder_path = os.path.join(self.result_folder, file_txt)
        os.makedirs(graph_folder_path, exist_ok=True)

        with open(os.path.join(graph_folder_path, f'graph_nodes.txt'), 'w') as f:
            for node in G.vs:
                f.write(f'{node["node_id"]}\n')  

        with open(os.path.join(graph_folder_path, f'graph_edges.txt'), 'w') as f:
            for edge in G.es:
                source_id = G.vs[edge.source]['node_id'] 
                target_id = G.vs[edge.target]['node_id'] 
                f.write(f'{source_id} {target_id}\n') 

    def clear_folder(self, folder_path):
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)

    def saveSubgraphs(self, G, communities):

        numberOfSubgraph = 0 

        membership = communities.membership

        graph_data = []

        file_txt = "subgraph_Data"
        subgraph_folder_path = os.path.join(self.result_folder, file_txt)
        if os.path.exists(subgraph_folder_path):
            shutil.rmtree(subgraph_folder_path)
        os.makedirs(subgraph_folder_path, exist_ok=True)

        for community_id in set(membership):
            numberOfSubgraph = numberOfSubgraph + 1
            nodes_in_community = [i for i, m in enumerate(membership) if m == community_id]
            subgraph = G.subgraph(nodes_in_community)

            nodes_list = [node.index for node in subgraph.vs]
            edges_list = [(e.source, e.target) for e in subgraph.es]
            graph_data.append({'nodes': nodes_list, 'edges': edges_list})
                       
            subgraph.vs['node_id'] = [G.vs[node]['node_id'] for node in nodes_in_community]

            for e in subgraph.es:
                source_id = subgraph.vs[e.source]['node_id']
                target_id = subgraph.vs[e.target]['node_id']
                e.update_attributes({'source_id': source_id, 'target_id': target_id})

            with open(os.path.join(subgraph_folder_path, f'subgraph_{community_id}_nodes.txt'), 'w') as f:
                for node in subgraph.vs:
                    f.write(f'{node["node_id"]}\n') 
            
            with open(os.path.join(subgraph_folder_path, f'subgraph_{community_id}_edges.txt'), 'w') as f:
                for edge in subgraph.es:
                    source_id = subgraph.vs[edge.source]['node_id'] 
                    target_id = subgraph.vs[edge.target]['node_id'] 
                    f.write(f'{source_id} {target_id}\n') 
        
        return numberOfSubgraph

    def communityPartition(self):

        nodes, edges = self.dataProcess()

        G = ig.Graph()

        node_id_to_index = {node_id: index for index, node_id in enumerate(nodes)}
        G.add_vertices(len(nodes))

        edge_list = [(node_id_to_index[src], node_id_to_index[dst]) for src, dst in edges]
        G.add_edges(edge_list)

        index_to_node_id = {index: node_id for node_id, index in node_id_to_index.items()}

        for i, v in enumerate(G.vs):
            v['node_id'] = index_to_node_id[i]

        for e in G.es:
            source_id = G.vs[e.source]['node_id']
            target_id = G.vs[e.target]['node_id']
            e.update_attributes({'source_id': source_id, 'target_id': target_id})

        communities = G.community_multilevel(resolution=2.5)
        
        self.saveInitGraph(G)
        numberOfSubgraph = self.saveSubgraphs(G, communities)

        return numberOfSubgraph
    
class get_feature_subgraph:
    def __init__(self, numberOfSubgraph, graphName):

        self.graphName = graphName
        self.numberOfSubgraph = numberOfSubgraph

    def embed_and_extract_features(self, graphs):
        features = []
        model = FeatherGraph() 
        model.fit(graphs)  
        embeddings = model.get_embedding() 
        
        for emb in embeddings:
            features.append(emb)

        return features

    def getFeatures(self):
        graph_data = []
        for i in range(self.numberOfSubgraph):
            edges_file = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{i}_edges.txt"
            nodes_file = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{i}_nodes.txt"
            with open(edges_file, 'r') as e_file, open(nodes_file, 'r') as n_file:
                nodes_data = [node.strip() for node in n_file.readlines()]
                edges_data = [tuple( edge.strip().split()) for edge in e_file.readlines()]
                graph_data.append({'nodes': nodes_data, 'edges': edges_data})

        graphs = []
        for data in graph_data:
            G = nx.Graph()
            G.add_nodes_from(data['nodes'])
            G.add_edges_from(data['edges'])
            graphs.append(G)

        for i, G in enumerate(graphs):
            mapping = {old_label: new_label for new_label, old_label in enumerate(sorted(G.nodes()))}
            graphs[i] = nx.relabel_nodes(G, mapping)
        # print("graphs",graphs)

        features = self.embed_and_extract_features(graphs)
        
        return features
    
class get_subgraph_cluster:
    def __init__(self, graphName, feathers):
        self.graphName = graphName
        self.feathers= feathers

    def getCluster(self):
        cluster_centers_indices = []
        clusters_str = []

        # affinity_propagation = AffinityPropagation(max_iter = 20000, convergence_iter=150, affinity='precomputed')
        alpha = 8
        affinity_propagation = 0
        if alpha == 0:
            affinity_propagation = AffinityPropagation()
        else:
            affinity_propagation = AffinityPropagation(preference = -alpha)
        clusters_affinity_propagation = affinity_propagation.fit_predict(self.feathers)
        clusters_str = ', '.join(map(str, clusters_affinity_propagation))

        cluster_centers_indices = affinity_propagation.cluster_centers_indices_
        cluster_centers_indices = cluster_centers_indices.astype(int)
        cluster_centers_indices = cluster_centers_indices.tolist()
        cluster_centers_indices = tuple(cluster_centers_indices)

        clusters_str = [int(x.strip()) for x in clusters_str.split(',')]

        save_data = {
            "clusters_str":clusters_str,
            "cluster_centers_indices":cluster_centers_indices
        }

        
        result_folder = ('../data_processed/{}'.format(self.graphName))
        cluster_folder_path = os.path.join(result_folder, 'cluster_result')
        os.makedirs(cluster_folder_path, exist_ok=True) 

        file_txt = ('cluster_result_subgraph.json')
        with open(os.path.join(cluster_folder_path, file_txt), 'w') as f:
            json.dump(save_data, f, indent=4)

class get_feature_representive_subgraph:
    def __init__(self, numberOfSubgraph, graphName):

        self.graphName = graphName
        self.numberOfSubgraph = numberOfSubgraph

    def embed_and_extract_features(self, graphs):
        features = []
        for G in graphs:
            node2vec = Node2Vec(G, dimensions=64, walk_length=30, num_walks=200, workers=4)
            model = node2vec.fit(window=10, min_count=1, batch_words=4)
            embeddings = np.array([model.wv[str(node)] for node in G.nodes()])
            feature = np.sum(embeddings, axis=0)
            features.append(feature)
        features = np.array(features)
        return features

    def getFeatures(self):
        graph_data = []
        cluster_result = f"../data_processed/{self.graphName}/cluster_result/cluster_result_subgraph.json"
        with open(cluster_result, "r") as file:
            cluster_result_data = json.load(file)
        cluster_centers_indices = cluster_result_data['cluster_centers_indices']
        for i, index in enumerate(cluster_centers_indices):
            edges_file = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{index}_edges.txt"
            nodes_file = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{index}_nodes.txt"
            with open(edges_file, 'r') as e_file, open(nodes_file, 'r') as n_file:
                nodes_data = [node.strip() for node in n_file.readlines()]
                edges_data = [tuple( edge.strip().split()) for edge in e_file.readlines()]               
                graph_data.append({'nodes': nodes_data, 'edges': edges_data})

        graphs = []
        for data in graph_data:
            G = nx.Graph()
            G.add_nodes_from(data['nodes'])
            G.add_edges_from(data['edges'])
            graphs.append(G)

        for i, G in enumerate(graphs):
            mapping = {old_label: new_label for new_label, old_label in enumerate(sorted(G.nodes()))}
            graphs[i] = nx.relabel_nodes(G, mapping)
        # print("graphs",graphs)

        features = self.embed_and_extract_features(graphs)
        
        return features
      
class get_representive_cluster:
    def __init__(self, graphName, feathers):
        self.graphName = graphName
        self.feathers= feathers

    def getCluster(self):
        cluster_centers_indices = []
        clusters_str = []

        affinity_propagation = AffinityPropagation()

        clusters_affinity_propagation = affinity_propagation.fit_predict(self.feathers)
        clusters_str = ', '.join(map(str, clusters_affinity_propagation))

        cluster_centers_indices = affinity_propagation.cluster_centers_indices_
        cluster_centers_indices = cluster_centers_indices.astype(int)
        cluster_centers_indices = cluster_centers_indices.tolist()
        cluster_centers_indices = tuple(cluster_centers_indices)

        clusters_str = [int(x.strip()) for x in clusters_str.split(',')]

        save_data = {
            "clusters_str":clusters_str,
            "cluster_centers_indices":cluster_centers_indices
        }
      
        result_folder = ('../data_processed/{}'.format(self.graphName))
        cluster_folder_path = os.path.join(result_folder, 'cluster_result')
        os.makedirs(cluster_folder_path, exist_ok=True) 

        file_txt = ('cluster_result_representive.json')
        with open(os.path.join(cluster_folder_path, file_txt), 'w') as f:
            json.dump(save_data, f, indent=4)


class get_simplified_init_position:
    def __init__(self, graphName):
        self.graphName = graphName

    def readClusteringCategory(self):
        read_file = f'../data_processed/{self.graphName}/cluster_result/cluster_result_subgraph.json'
        clusteringCategoryData = self.load_json(read_file)
        clusteringCategoryData = clusteringCategoryData['clusters_str']

        return clusteringCategoryData

    def getSimplifiedPosition(self):
        clusteringCategory = self.readClusteringCategory()
        numberOfFiles = len(clusteringCategory)

        allNodes = []
        allEdges = []

        for i in range(numberOfFiles):
            nodes, edges = self.read_data_and_process(i, self.graphName, clusteringCategory)

            allEdges.append(edges)
            allNodes.append(nodes)

        if len(allNodes) == numberOfFiles and len(allEdges) == numberOfFiles:

            self.processData(allNodes, allEdges, self.graphName)


    def load_json(self, file_path):
        try:
            with open(file_path, 'r') as file:
                data = json.load(file)
                return data
        except FileNotFoundError as e:
            print("read JSON error:", e)

    def count_connections_between_subgraphs(self, subgraphs_nodes, total_graph_edges):
        num_subgraphs = len(subgraphs_nodes)
        connections = {}

        total_edges_set = {(edge['source']['id'], edge['target']['id']) for edge in total_graph_edges}

        connections = [[0 for _ in range(num_subgraphs)] for _ in range(num_subgraphs)]

        def count_connections(i, j):
            subgraph1_nodes = subgraphs_nodes[i]
            subgraph2_nodes = subgraphs_nodes[j]
            connection_count = 0

            for node1 in subgraph1_nodes:
                for node2 in subgraph2_nodes:
                    node1_id = node1['id']
                    node2_id = node2['id']
                    if (node1_id, node2_id) in total_edges_set or (node2_id, node1_id) in total_edges_set:
                        connection_count += 1
            connections[i][j] = connection_count
            return connection_count


        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(count_connections, i, j) for i in range(num_subgraphs) for j in range(i + 1, num_subgraphs)]

        return connections
    
    def processData(self, nodesArray, edgesArray, graphName):

        file_path = f'../data/init_graph_json/{graphName}_init_graph_data.json'

        init_position = self.load_json(file_path)

        initNodes = init_position.get('nodes', [])

        community_nums = len(nodesArray)
        community_nodes = []

        init_nodes_array = np.array(initNodes)

        def process_nodes(i, nodes):
            result = []
            x, y, vx, vy, size = 0, 0, 0, 0, 0
            minX, minY, maxX, maxY = float('inf'), float('inf'), float('-inf'), float('-inf')
            for node in nodes:
                for init_node in init_nodes_array:
                    if init_node['id'] == node['id']:
                        
                        x += init_node['x']
                        y += init_node['y']
                        vx += init_node['vx']
                        vy += init_node['vy']
                        size += 1
                        if(init_node['x'] < minX):
                            minX = init_node['x']
                        if(init_node['y'] < minY):
                            minY = init_node['y']
                        if(init_node['x'] > maxX):
                            maxX = init_node['x']
                        if(init_node['y'] > maxY):
                            maxY = init_node['y']


            result.append({
                'id': i,
                'x': x / size if size != 0 else 0,
                'y': y / size if size != 0 else 0,
                'vx': vx / size if size != 0 else 0,
                'vy': vy / size if size != 0 else 0,
                'minX': minX,
                'minY': minY,
                'maxX': maxX,
                'maxY': maxY,
                'size': size
            })
            return result

        with ThreadPoolExecutor() as executor:
            results = list(executor.map(process_nodes, range(community_nums), nodesArray))

        for community_result in results:
            community_nodes.extend(community_result)


        total_graph_edges = init_position.get('links', [])
        connections = self.count_connections_between_subgraphs(nodesArray, total_graph_edges)

        community_edges = []

        community_nums = len(connections)
        for i in range(community_nums):
            for j in range(i + 1, community_nums):
                if connections[i][j] != 0:
                    community_edges.append({'source': i, 'target': j, 'size': connections[i][j]})

        data_to_save = {
            'nodes': community_nodes,
            'links': community_edges
        }


        output_file = f'../data_processed/{self.graphName}/simplified_init_position/simplified_init_position.json'
        os.makedirs(output_file, exist_ok=True)  
        file_txt = 'simplified_position.json'

        with open(os.path.join(output_file, file_txt), 'w') as file:
            json.dump(data_to_save, file, indent=4)


    def read_data_and_process(self, i, graphName, clusteringCategory):
        edgesFile = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{i}_edges.txt"
        nodesFile = f"../data_processed/{self.graphName}/subgraph_Data/subgraph_{i}_nodes.txt"


        with open(nodesFile, 'r') as file:
            nodesData = file.read().splitlines()
            if self.graphName != 'test':
                nodes = [{'id': int(node.strip()), 'degree': 0} for node in nodesData if node.strip()]
                with open(edgesFile, 'r') as edge_file:
                    edgesData = edge_file.read().splitlines()
                    edges = []

                    for edge_str in edgesData:
                        name_list = edge_str.split()
                        source, target = int(name_list[0]), int(name_list[1])

                        for node in nodes:
                            if node['id'] == source or node['id'] == target:
                                node['degree'] += 1

                        edges.append({'source': source, 'target': target})
            else:

                nodes = [{'id': (node.strip()), 'degree': 0} for node in nodesData if node.strip()]
                with open(nodesFile, 'r') as file:
                    nodesData = file.read().splitlines()
                    nodes = [{'id': (node.strip()), 'degree': 0} for node in nodesData if node.strip()]

                    with open(edgesFile, 'r') as edge_file:
                        edgesData = edge_file.read().splitlines()
                        edges = []

                        for edge_str in edgesData:
                            name_list = edge_str.split()
                            source, target = (name_list[0]), (name_list[1])

                            for node in nodes:
                                if node['id'] == source or node['id'] == target:
                                    node['degree'] += 1

                            edges.append({'source': source, 'target': target})
        return nodes, edges