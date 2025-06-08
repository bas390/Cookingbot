import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>มีบางอย่างผิดพลาด</Text>
          <Text style={styles.message}>
            กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text>ลองใหม่</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
} 