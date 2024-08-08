import networkx as nx
import numpy as np
import pickle


class DatasetForTest():
    """
    This class provided these methods:
    - edgelist2networkx: convert an edgelist file to graph in networkx format.
        If features file is present, it must be in dict format, with keys are nodes' id and values are features in list format.
    - networkx2edgelist: convert an graph of networkx format to edgelist file,
        save features if present in networkx.
    """

    def __init__(self, graph_file):

        self.graph = nx.Graph()
        with open(graph_file, 'r') as file:
            for line in file:

                if not line.strip():
                    continue

                names = line.strip().split()

                self.graph.add_edge(names[0], names[1])


    def graph2adj(self):

        ##################### Load data ######################################

        if nx.is_empty(self.graph):
            return np.array([[0]])
        adj = nx.adjacency_matrix(self.graph, nodelist=sorted(self.graph.nodes())).todense().astype(float)
        adj = np.array(adj[:, :])

        return adj