from encoder.REGAL.xnetmf_config import *

from encoder.LREA.LREA import LREA

from dataprocess.DatasetForTest import DatasetForTest


import networkx as nx


import os
import json


def main():

    graphName = 'Cpan'
    # graphName = 'AS-733'
    # graphName = 'test'

    cluster_result = f"../data_processed/{graphName}/cluster_result/cluster_result_subgraph.json"
    with open(cluster_result, "r") as file:
        cluster_result_data = json.load(file)
    cluster_centers_indices = cluster_result_data['cluster_centers_indices']

    cluster_result_representive = f"../data_processed/{graphName}/cluster_result/cluster_result_representive.json"
    with open(cluster_result_representive, "r") as file:
        cluster_result_data = json.load(file)

    clusteringCategoryForRepresentive = cluster_result_data['clusters_str']
    clusterCentersIndicesForRepresentive = cluster_result_data['cluster_centers_indices']

    subgraph_txt = f"../data_processed/{graphName}/subgraph_Data"

    files = os.listdir(subgraph_txt)

    sorted_files = sorted((f for f in files if f.endswith('edges.txt')), key=lambda x: int(x.split('_')[1]))

    all_adj_matrices = []

    for filename in sorted_files:

        filepath = os.path.join(subgraph_txt, filename)
        dataset = DatasetForTest(filepath)
        adj = dataset.graph2adj()
        all_adj_matrices.append(adj)

    all_graph_align_supergraph = [] 

    for clusterCentersIndicesForRepresentiveIndex in range(len(clusterCentersIndicesForRepresentive)):

        adj_matrices = []
        adj_index = []
        for cluster_representive_index, clusters_str_representive in enumerate(clusteringCategoryForRepresentive):
            if clusters_str_representive == clusterCentersIndicesForRepresentiveIndex:
                adj_index.append(cluster_centers_indices[cluster_representive_index])
        for i, index in enumerate(adj_index):
            adj_matrices.append(all_adj_matrices[index])

        super_graph = []
        aligned_nodes_pairs = []
        graph_align_supergraph = []

        if len(adj_matrices) == 1:
            G = nx.from_numpy_matrix(adj_matrices[0])

            file_txt = ('supergraph_data{}.txt'.format(clusterCentersIndicesForRepresentiveIndex))
            result_folder = (
                '../data_processed/{}/supergraph_data'.format(graphName))
            os.makedirs(result_folder, exist_ok=True)

            with open(os.path.join(result_folder, file_txt), 'w') as f:
                f.write("Nodes:\n")
                for node in G.nodes():
                    f.write(f"{node}\n")
                f.write("\n")

                f.write("Edges:\n")
                for edge in G.edges():
                    f.write(f"{edge[0]} {edge[1]}\n")

            all_graph_align_supergraph.append([])

            continue

        for i, adj in enumerate(adj_matrices):
            cur_graph_align_supergraph = []
            if i == 0:
                super_graph = adj
                for id in range(super_graph.shape[0]):
                    cur_graph_align_supergraph.append((id, id))
                graph_align_supergraph.append(cur_graph_align_supergraph)
                continue

            adjA = adj
            adjB = super_graph

            degree_a = []
            degree_b = []
            for row in adjA:
                degree = sum(1 for item in row if item != 0)
                degree_a.append(degree)
            degree_a_sorted_indices = sorted(range(len(degree_a)), key=lambda i: degree_a[i], reverse=True)

            for row in adjB:
                degree = sum(1 for item in row if item != 0)
                degree_b.append(degree)
            degree_b_sorted_indices = sorted(range(len(degree_b)), key=lambda i: degree_b[i], reverse=True)

            alignment_matrix = []

            encoder = LREA(adjA, adjB)
            alignment_matrix = encoder.align()

            alignment_matrix = alignment_matrix.toarray()

            encoder_matrix = alignment_matrix

            def select_align_nodes(matrix):

                flatten_indices = np.argsort(matrix.flatten())[::-1] 

                sorted_values = matrix.flatten()[flatten_indices]
                sorted_indices = np.unravel_index(flatten_indices, matrix.shape)

                filter_indices = np.where(sorted_values >= 0.8)
                filtered_values = sorted_values[filter_indices]

                filtered_indices = (sorted_indices[0][filter_indices], sorted_indices[1][filter_indices])

                filtered_indices_list = list(zip(filtered_indices[0], filtered_indices[1]))

                selected_rows = set() 
                selected_columns = set()  
                selected_values = []  
                aligned_pairs = []  

                filtered_indices_list_len = len(filtered_indices_list)

                for index, node_index in enumerate(degree_b_sorted_indices):
                    cur_node = node_index
                    for idx, pair in enumerate(filtered_indices_list):

                        if pair[0] in selected_rows or pair[1] in selected_columns or pair[1] != cur_node:
                            continue

                        if (degree_b[pair[1]] == 1 and degree_a[pair[0]] != 1) or (degree_b[pair[1]] != 1 and degree_a[pair[0]] == 1):
                            continue

                        idx1 = idx + 1
                        cur_pair = pair
                        cur_value = filtered_values[idx]
                        cur_degree_diff = abs(degree_a[cur_pair[0]] - degree_b[cur_pair[1]])
                        while idx1 < filtered_indices_list_len:
                            temp_pair = filtered_indices_list[idx1]
                            if temp_pair[0] == cur_pair[0] and cur_value - filtered_values[idx1] < 0.2 and abs(degree_a[temp_pair[0]] - degree_b[temp_pair[1]]) < cur_degree_diff and temp_pair[1] not in selected_columns:
                                cur_pair = temp_pair
                                cur_degree_diff = abs(degree_a[temp_pair[0]] - degree_b[temp_pair[1]])
                                cur_value = filtered_values[idx1]
                            idx1 = idx1 + 1

                        aligned_pairs.append(cur_pair)
                        selected_values.append(cur_value)
                        selected_rows.add(cur_pair[0])
                        selected_columns.add(cur_pair[1])

                return selected_values, aligned_pairs

            selected_values, aligned_pairs = select_align_nodes(encoder_matrix)

            aligned_nodes_pairs.append(aligned_pairs)

            def merge_graphs(graph1, graph2, aligned_nodes):

                merged_size = graph1.shape[0] + graph2.shape[0] - len(aligned_nodes)
                merged_graph = np.zeros((merged_size, merged_size), dtype=float)
                merged_graph[:graph2.shape[0], :graph2.shape[0]] = graph2

                index = graph2.shape[0] 
                merged_graph_to_graph1 = []
                for i in range(graph1.shape[0]):
                    node_i_is_align = False
                    for pair in aligned_nodes:
                        if i == pair[0]:
                            node_i_is_align = True
                            break
                    if node_i_is_align:
                        continue

                    merged_graph_to_graph1.append((index, i))

                    cur_graph_align_supergraph.append((i, index))

                    for j in range(graph1.shape[1]):
                        if graph1[i][j] == 1:
                            node_j_is_align = False
                            for pair in aligned_nodes:
                                if j == pair[0]:
                                    merged_graph[index][pair[1]] = 1.0
                                    merged_graph[pair[1]][index] = 1.0
                                    node_j_is_align = False
                                    break
                            if node_j_is_align or j > i:

                                continue

                            for pair in merged_graph_to_graph1:
                                if j == pair[1]:
                                    merged_graph[index][pair[0]] = 1.0
                                    merged_graph[pair[0]][index] = 1.0
                                    break
                    index = index + 1

                return merged_graph


            for i, pair in enumerate(aligned_pairs):
                cur_graph_align_supergraph.append(pair)

            super_graph = merge_graphs(adjA, adjB, aligned_pairs)

            graph_align_supergraph.append(cur_graph_align_supergraph)

            G = nx.from_numpy_matrix(super_graph)

            file_txt = ('supergraph_data{}.txt'.format(clusterCentersIndicesForRepresentiveIndex))
            result_folder = ('../data_processed/{}/supergraph_data'.format(graphName))
            os.makedirs(result_folder, exist_ok=True) 

            with open(os.path.join(result_folder, file_txt), 'w') as f:

                f.write("Nodes:\n")
                for node in G.nodes():
                    f.write(f"{node}\n")
                f.write("\n") 

                f.write("Edges:\n")
                for edge in G.edges():
                    f.write(f"{edge[0]} {edge[1]}\n")

        def convert_to_dict(lst):
            return [{int(t[0]): int(t[1]) for t in sub_lst} for sub_lst in lst]

        graph_align_supergraph_dict = convert_to_dict(graph_align_supergraph)

        all_graph_align_supergraph.append(graph_align_supergraph_dict)

    file_txt = ('graph_align_supergraph.json')
    result_folder = ('../data_processed/{}'.format(graphName))
    cluster_folder_path = os.path.join(result_folder, file_txt)
    os.makedirs(cluster_folder_path, exist_ok=True)

    with open(os.path.join(cluster_folder_path, file_txt), 'w') as f:
        json.dump(all_graph_align_supergraph, f, indent=4)

    print("Run completed")

if __name__ == "__main__":
    main()
