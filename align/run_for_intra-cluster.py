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

    clusteringCategory = cluster_result_data['clusters_str']
    cluster_centers_indices = cluster_result_data['cluster_centers_indices']

    adj_matrices = []

    # 指定目录路径
    subgraph_txt = f"../data_processed/{graphName}/subgraph_Data"

    files = os.listdir(subgraph_txt)

    sorted_files = sorted((f for f in files if f.endswith('edges.txt')), key=lambda x: int(x.split('_')[1]))

    for filename in sorted_files:
        filepath = os.path.join(subgraph_txt, filename)
        dataset = DatasetForTest(filepath)
        adj = dataset.graph2adj()
        adj_matrices.append(adj)

    result_folder = ('../data_processed/{}/'.format(graphName))

    for i, adj in enumerate(adj_matrices):

        G = nx.from_numpy_matrix(adj)

        directory = result_folder + 'unaligned_subgraph_data'
        if not os.path.exists(directory):
            os.makedirs(directory)
        file_path = os.path.join(directory, f'unaligned_subgraph_{i}.txt') 
        with open(file_path, 'w') as f:
            f.write("Nodes:\n")
            for node in G.nodes():
                f.write(f"{node}\n")
            f.write("\n")  

            f.write("Edges:\n")
            for edge in G.edges():
                f.write(f"{edge[0]} {edge[1]}\n")

    aligned_nodes_pairs = []

    clusteringCategory = clusteringCategory
    cluster_centers_indices = cluster_centers_indices

    for i, adj in enumerate(adj_matrices):

        representative_subgraph = adj_matrices[cluster_centers_indices[clusteringCategory[i]]]

        if i == cluster_centers_indices[clusteringCategory[i]]:
            unaligned_data = []
            for id in range(representative_subgraph.shape[0]):
                unaligned_data.append((id, 0))
            directory = result_folder + 'aligned_subgraph_point_data'
            if not os.path.exists(directory):
                os.makedirs(directory)
            file_path = os.path.join(directory, f'alignedSubgraph_{i}_.txt')
            with open(file_path, 'w') as file:
                for pair in unaligned_data:
                    file.write(f"{pair[0]}, {pair[1]}\n")
            continue

        adjA = adj
        adjB = representative_subgraph

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

        encoder = LREA(adjA, adjB)
        alignment_matrix = encoder.align()
        encoder_matrix = alignment_matrix.toarray()

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

                    idx1 = idx + 1
                    cur_pair = pair  
                    cur_value = filtered_values[idx]
                    cur_degree_diff = abs(degree_a[cur_pair[0]] - degree_b[cur_pair[1]])
                    while idx1 < filtered_indices_list_len:
                        temp_pair = filtered_indices_list[idx1]
                        if temp_pair[0] == cur_pair[0] and cur_value - filtered_values[idx1] < 0.2 and abs(
                                degree_a[temp_pair[0]] - degree_b[temp_pair[1]]) < cur_degree_diff and temp_pair[
                            1] not in selected_columns:
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

        unaligned_data = []
        for adjB_id in range(adjB.shape[0]):
            node_i_aligned = False
            for j, pair in enumerate(aligned_pairs):
                if pair[1] == adjB_id:
                    node_i_aligned = True
                    id = pair[0]
                    node_have_unaligned = 0
                    for k, node in enumerate(adjA[id]):
                        if node == 1:
                            is_in_first_elements = any(k == pair[0] for pair in aligned_pairs)
                            if is_in_first_elements != True:
                                node_have_unaligned = node_have_unaligned + 1
                    unaligned_data.append((adjB_id, node_have_unaligned))
                    break
            if not node_i_aligned:
                unaligned_data.append((adjB_id, -1))

        directory = result_folder + 'aligned_subgraph_point_data'
        if not os.path.exists(directory):
            os.makedirs(directory)
        file_path = os.path.join(directory, f'alignedSubgraph_{i}_.txt')
        with open(file_path, 'w') as file:
            for pair in unaligned_data:
                file.write(f"{pair[0]}, {pair[1]}\n")

    print("Run completed")

if __name__ == "__main__":
    main()